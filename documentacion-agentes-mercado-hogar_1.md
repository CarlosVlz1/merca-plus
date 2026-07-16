# App de lista de mercado del hogar — documentación para agentes

> Stack acordado: Next.js + Supabase/Postgres. Si esto cambia, este documento debe regenerarse.

## 1. Resumen del proyecto

App web (con soporte PWA) para que un hogar reemplace el cuaderno físico de mercado. Catálogo reutilizable de ítems, checklist semanal para armar la lista, precios por ítem con historial, y sincronización entre miembros del hogar. Salida clave del MVP: generar texto listo para pegar en el WhatsApp del súper.

## 2. Stack técnico

| Capa | Herramienta |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind |
| Backend | Supabase (Postgres, Auth, Realtime, Row Level Security, Edge Functions) |
| Esquema/migraciones | Prisma (`schema.prisma` + `prisma migrate`) |
| Acceso a datos en runtime | `supabase-js` (sin API REST propia; RLS es la capa de seguridad) |
| Validación | `zod`, compartido entre formularios de frontend y Edge Functions |
| Tests unitarios | Vitest, solo para funciones puras en `/lib` |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) |
| PWA | `manifest.json` + service worker |

## 3. Modelo de datos

Convención de nombres: Prisma usa camelCase en el código, pero cada tabla y columna se mapea a snake_case en Postgres con `@map`/`@@map` — es lo que esperan las políticas RLS de la sección 5.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum MemberRole {
  OWNER
  MEMBER
}

enum ListStatus {
  ACTIVE
  CLOSED
}

model Household {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  members   HouseholdMember[]
  items     Item[]
  lists     ShoppingList[]
  invites   HouseholdInvite[]

  @@map("households")
}

model HouseholdMember {
  id          String     @id @default(uuid())
  householdId String     @map("household_id")
  household   Household  @relation(fields: [householdId], references: [id])
  userId      String     @map("user_id") // id de auth.users (Supabase Auth)
  role        MemberRole @default(MEMBER)
  joinedAt    DateTime   @default(now()) @map("joined_at")

  @@unique([householdId, userId])
  @@map("household_members")
}

model HouseholdInvite {
  id              String    @id @default(uuid())
  householdId     String    @map("household_id")
  household       Household @relation(fields: [householdId], references: [id])
  code            String    @unique
  createdByUserId String    @map("created_by_user_id")
  expiresAt       DateTime  @map("expires_at")
  usedByUserId    String?   @map("used_by_user_id")
  usedAt          DateTime? @map("used_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@map("household_invites")
}

model Item {
  id           String   @id @default(uuid())
  householdId  String   @map("household_id")
  household    Household @relation(fields: [householdId], references: [id])
  name         String
  category     String
  unit         String?
  lastPrice    Decimal? @map("last_price") @db.Decimal(10, 2)
  createdAt    DateTime @default(now()) @map("created_at")
  listItems    ShoppingListItem[]
  priceHistory PriceHistory[]

  @@unique([householdId, name, category])
  @@map("items")
}

model ShoppingList {
  id          String     @id @default(uuid())
  householdId String     @map("household_id")
  household   Household  @relation(fields: [householdId], references: [id])
  status      ListStatus @default(ACTIVE)
  createdAt   DateTime   @default(now()) @map("created_at")
  closedAt    DateTime?  @map("closed_at")
  items       ShoppingListItem[]

  @@map("shopping_lists")
}

model ShoppingListItem {
  id              String   @id @default(uuid())
  listId          String   @map("list_id")
  list            ShoppingList @relation(fields: [listId], references: [id])
  itemId          String   @map("item_id")
  item            Item @relation(fields: [itemId], references: [id])
  quantity        Decimal  @default(1) @db.Decimal(10, 2)
  price           Decimal? @db.Decimal(10, 2)
  checked         Boolean  @default(false)
  addedByUserId   String   @map("added_by_user_id")
  checkedByUserId String?  @map("checked_by_user_id")
  createdAt       DateTime @default(now()) @map("created_at")

  @@unique([listId, itemId])
  @@map("shopping_list_items")
}

model PriceHistory {
  id         String   @id @default(uuid())
  itemId     String   @map("item_id")
  item       Item @relation(fields: [itemId], references: [id])
  price      Decimal  @db.Decimal(10, 2)
  recordedAt DateTime @default(now()) @map("recorded_at")

  @@map("price_history")
}
```

**Validaciones de negocio** (aplicadas con `zod` antes de llegar a Supabase):
- `quantity` > 0, hasta 2 decimales.
- `price` >= 0, hasta 2 decimales.
- `Item.name` no vacío, único por `(householdId, name, category)` — ya reforzado a nivel de base.
- `HouseholdInvite.code` de 8 caracteres alfanuméricos, `expiresAt` = creación + 7 días.

## 4. Políticas de seguridad (RLS)

Patrón base, a replicar en `items`, `shopping_lists`, `price_history`:

```sql
create policy "select_by_household_membership"
on items for select
using (
  household_id in (select household_id from household_members where user_id = auth.uid())
);
-- Repetir para insert (with check), update y delete.
```

`shopping_list_items` no tiene `household_id` directo — la política resuelve vía join contra `shopping_lists`:

```sql
create policy "select_by_household_membership"
on shopping_list_items for select
using (
  list_id in (
    select id from shopping_lists
    where household_id in (select household_id from household_members where user_id = auth.uid())
  )
);
```

**Caso especial — `household_invites` y redención:** quien redime un código todavía no es miembro del hogar, así que RLS normal lo bloquearía. La redención se hace con una función `SECURITY DEFINER` (bypassa RLS de forma controlada, valida el código y crea la membresía en una sola transacción):

```sql
create or replace function redeem_household_invite(invite_code text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id
  from household_invites
  where code = invite_code and used_at is null and expires_at > now();

  if v_household_id is null then
    raise exception 'invite_invalid_or_expired';
  end if;

  insert into household_members (household_id, user_id, role)
  values (v_household_id, auth.uid(), 'MEMBER');

  update household_invites set used_at = now(), used_by_user_id = auth.uid()
  where code = invite_code;

  return v_household_id;
end;
$$;
```

Igual patrón (función `SECURITY DEFINER`) para `create_household(name text)`, que crea el hogar y la membresía `OWNER` en una sola transacción — evita estados intermedios donde exista un hogar sin dueño.

## 5. Contratos de datos por pantalla

Cada bloque es el contrato mínimo que un agente necesita para implementar la pantalla sin inventar decisiones.

**Login / registro**
- `supabase.auth.signUp({ email, password })`
- `supabase.auth.signInWithPassword({ email, password })`
- Errores a mapear: `user_already_exists` → "Ese correo ya tiene una cuenta.", credenciales inválidas → "Correo o contraseña incorrectos."

**Crear hogar**
- `supabase.rpc('create_household', { name })`

**Invitar / unirse**
- Crear: `supabase.from('household_invites').insert({ household_id, code, expires_at })`, mostrar `https://[dominio]/join/{code}`
- Unirse: `supabase.rpc('redeem_household_invite', { invite_code })`
- Error a mapear: `invite_invalid_or_expired` → "Este enlace ya no es válido. Pide uno nuevo."

**Catálogo**
- Listar: `supabase.from('items').select('*').eq('household_id', householdId).order('category')`
- Crear/editar/eliminar: mutaciones estándar con `household_id` fijado desde el contexto del hogar activo, nunca desde el formulario.

**Checklist / lista activa**
- Obtener lista activa: `supabase.from('shopping_lists').select('*').eq('household_id', householdId).eq('status', 'ACTIVE').maybeSingle()` — si es `null`, crear una nueva.
- Marcar/editar ítem: `upsert` en `shopping_list_items` sobre `(list_id, item_id)`.
- Suscripción Realtime (fase 3): `supabase.channel('list:' + listId).on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items', filter: 'list_id=eq.' + listId }, handler).subscribe()`

**Historial**
- `supabase.from('price_history').select('*').eq('item_id', itemId).order('recorded_at')`

## 6. Formato del texto para WhatsApp

Función pura `formatListForWhatsApp(items: ShoppingListItemWithDetails[]): string`. Reglas:
- Solo incluye ítems con `checked = true`.
- Agrupados por `category`, en el orden en que aparecen en el catálogo.
- Una línea por ítem: `- {nombre} x{cantidad}`. Sin precios (se registran al comprar, no antes).
- Sin categorías vacías.

Ejemplo de salida:

```
Lista de mercado

Lácteos
- Leche entera (1 lt) x2
- Queso costeño x1

Frutas y verduras
- Tomate (libra) x3
```

## 7. Manejo de errores y estados

- Toda pantalla que lea datos maneja tres estados explícitos: `loading`, `error`, `ready` (una lista vacía es un `ready` con 0 elementos, no un estado aparte).
- Los errores de Supabase nunca se muestran crudos al usuario — se mapean a un mensaje corto en español (ver ejemplos en la sección 5).
- Mensajes de confirmación sin "Error:" ni signos de exclamación: "No se pudo guardar el precio. Intenta de nuevo."

## 8. Variables de entorno y despliegue

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo en Edge Functions/servidor, nunca en el cliente
DATABASE_URL=                # para `prisma migrate`, apunta al Postgres de Supabase
```

Despliegue: frontend en Vercel conectado al repo (variables públicas en el dashboard de Vercel); backend en Supabase Cloud, migraciones aplicadas con `prisma migrate deploy` apuntando a `DATABASE_URL`.

## 9. Testing mínimo

Dado el tamaño del proyecto, no se exige suite exhaustiva:
- Toda función pura en `/lib` (`formatListForWhatsApp`, cálculo de totales) lleva al menos un test con Vitest.
- El resto de criterios de aceptación por tarea (sección 11) se verifican manualmente.

## 10. Estructura de carpetas

```
/app
  /(auth)/login
  /(auth)/join/[code]
  /(app)/dashboard
  /(app)/list/[listId]
  /(app)/history
/lib
  supabase/client.ts
  supabase/server.ts
  whatsapp/format-list.ts
  validation/schemas.ts
/components
  checklist/
  list-item-row.tsx
  household-switcher.tsx
/prisma
  schema.prisma
```

## 11. Convenciones para agentes

- Una tarea = un commit atómico.
- TypeScript estricto, sin `any` salvo justificación explícita en el código.
- Ninguna consulta a Supabase se implementa sin que exista antes una política RLS que la cubra.
- `household_id` nunca viene de un input del usuario — siempre del hogar activo en el contexto de sesión.

## 12. Tareas atómicas por fase

### Fase 0 — Setup

| ID | Tarea | Criterio de aceptación | Depende de |
|---|---|---|---|
| F0-01 | Crear proyecto Supabase y proyecto Next.js | Repos creados, `.env` con claves configurado | — |
| F0-02 | Definir `schema.prisma` con `@map`/`@@map` en snake_case y migrar | Tablas creadas en Postgres con nombres snake_case | F0-01 |
| F0-03 | Configurar Supabase Auth (email/password) | Login y registro funcionan desde el dashboard de Supabase | F0-01 |
| F0-04 | Escribir políticas RLS base + funciones `SECURITY DEFINER` (`create_household`, `redeem_household_invite`) | Políticas y funciones probadas con 2 usuarios en hogares distintos | F0-02, F0-03 |
| F0-05 | Configurar cliente `supabase-js` (browser y server) | El cliente lee una tabla de prueba desde Next.js | F0-01 |
| F0-06 | Configurar variables de entorno y pipeline de despliegue (Vercel + Supabase) | Deploy de un "hola mundo" accesible en una URL pública | F0-01 |

### Fase 1 — MVP

| ID | Tarea | Criterio de aceptación | Depende de |
|---|---|---|---|
| F1-01 | Pantalla de login/registro | Usuario crea cuenta e inicia sesión; errores mapeados según sección 5 | F0-03 |
| F1-02 | Crear hogar (UI + RPC `create_household`) | Usuario crea un hogar y queda como `OWNER` | F0-04 |
| F1-03 | Invitar y unirse a hogar (UI + RPC `redeem_household_invite`) | Un segundo usuario se une con el código antes de que expire; código vencido muestra el error mapeado | F1-02 |
| F1-04 | CRUD de catálogo de ítems | Ítems visibles solo dentro de su hogar; validaciones de la sección 3 aplicadas | F1-03 |
| F1-05 | Vista de checklist semanal | Al marcar un ítem se crea o actualiza la `ShoppingList` activa | F1-04 |
| F1-06 | Función `formatListForWhatsApp` + botón copiar | Test unitario con el ejemplo de la sección 6 pasa; botón copia al portapapeles | F1-05 |

### Fase 2 — Precios

| ID | Tarea | Criterio de aceptación | Depende de |
|---|---|---|---|
| F2-01 | Campo de precio editable por ítem de lista | Precio se guarda en `shopping_list_items`; rechaza valores negativos | F1-05 |
| F2-02 | Registrar en `price_history` al marcar como comprado | Cada marcado como comprado crea un registro histórico | F2-01 |
| F2-03 | Total estimado de la lista | El total se recalcula sin recargar al editar precio o cantidad | F2-01 |

### Fase 3 — Tiempo real

| ID | Tarea | Criterio de aceptación | Depende de |
|---|---|---|---|
| F3-01 | Suscripción Realtime a `shopping_list_items` de la lista activa | Cambios de otro miembro aparecen sin recargar | F1-05 |
| F3-02 | Indicador de quién marcó cada ítem | Nombre o avatar visible junto al ítem marcado | F3-01 |

### Fase 4 — Inteligencia y PWA

| ID | Tarea | Criterio de aceptación | Depende de |
|---|---|---|---|
| F4-01 | Edge Function de sugerencias por frecuencia de compra | Endpoint devuelve ítems que probablemente faltan según el historial | F2-02 |
| F4-02 | Vista de historial de precios por ítem | Gráfico de línea simple con la evolución del precio en el tiempo | F2-02 |
| F4-03 | Manifest y service worker (PWA) | App instalable desde el navegador; checklist funciona sin conexión | F1-05 |
