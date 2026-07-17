# App de lista de mercado del hogar — documentación para agentes

> Stack acordado: Next.js + Supabase/Postgres. Si esto cambia, este documento debe regenerarse.

## 1. Resumen del proyecto

App web (con soporte PWA) para que un hogar reemplace el cuaderno físico de mercado. Catálogo reutilizable de ítems, checklist semanal para armar la lista, precios por ítem con historial, y sincronización entre miembros del hogar. Salida clave del MVP: generar texto listo para pegar en el WhatsApp del súper.

## 2. Stack técnico

| Capa | Herramienta |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Backend | Supabase (Postgres, Auth, Realtime, Row Level Security, Edge Functions) |
| Esquema/migraciones | Prisma (`schema.prisma` + `prisma migrate`) |
| Acceso a datos en runtime | `supabase-js` (sin API REST propia; RLS es la capa de seguridad) |
| Validación | `zod`, compartido entre formularios de frontend |
| Tests unitarios | Vitest, solo para funciones puras en `/lib` |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) |
| PWA | `src/app/manifest.ts` + `public/sw.js` + `ServiceWorkerRegister` |

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
  total       Decimal?   @default(0) @map("total") @db.Decimal(12, 2) // se persiste al cerrar la lista
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
- `supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })`
  - `full_name` = `"${firstName} ${lastName}"` (dos campos separados en el formulario)
  - `phone` = `"${dialCode} ${number}"` (selector de código de país + número)
- `supabase.auth.signInWithPassword({ email, password })`
- Errores a mapear: `user_already_exists` → "Ese correo ya tiene una cuenta.", credenciales inválidas → "Correo o contraseña incorrectos."
- Validaciones en el esquema Zod (`signUpSchema`):
  - `firstName` mín. 2 chars, `lastName` mín. 2 chars
  - `password` mín. 8 chars, al menos 1 mayúscula y 1 número
  - `confirmPassword` debe coincidir con `password`

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
- Al agregar ítem: usar `.select('*, item:items(*)')` para obtener detalles del ítem y actualizar el estado local directamente (sin recargar la página).
- Total estimado: calculado en tiempo real desde `priceInputs` (estado local), no desde `shopping_list_items.price`.
- Cerrar lista: guarda precios en `price_history`, actualiza `items.last_price`, persiste el total calculado en `shopping_lists.total`, cambia `status` a `'CLOSED'`.
- Suscripción Realtime (fase 3): `supabase.channel('list:' + listId).on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items', filter: 'list_id=eq.' + listId }, handler).subscribe()`

**Historial**
- Listas completadas: `supabase.from('shopping_lists').select('*, items:shopping_list_items(*, item:items(*))').eq('household_id', householdId).eq('status', 'CLOSED').order('closed_at', { ascending: false })`
- El total de cada lista usa `shopping_lists.total` si es > 0; si no, se recalcula desde los ítems.
- Historial de precios por ítem: `supabase.from('price_history').select('*').eq('item_id', itemId).order('recorded_at')`

## 6. Formato del texto para WhatsApp

Función pura `formatListForWhatsApp(items: ShoppingListItemWithDetails[]): string`. Reglas:
- Solo incluye ítems con `checked = false` (pendientes, no obtenidos aún).
- Agrupados por `category`.
- Una línea por ítem: `*{nombre}*` si tiene unidad → `*{nombre} ({unit})*`, con cantidad al lado.
- Sin categorías vacías.
- Pie de mensaje con "Merca+ 🛒".

Ejemplo de salida:

```
Lista de mercado 🛒

🥛 Lácteos
• *Leche entera (1 lt)* x2
• *Queso costeño* x1

🥬 Frutas y verduras
• *Tomate (libra)* x3

_Enviado desde Merca+ 🛒_
```

## 7. Manejo de errores y estados

- Toda pantalla que lea datos maneja tres estados explícitos: `loading`, `error`, `ready` (una lista vacía es un `ready` con 0 elementos, no un estado aparte).
- Los errores de Supabase nunca se muestran crudos al usuario — se mapean a un mensaje corto en español (ver ejemplos en la sección 5).
- Mensajes de confirmación sin "Error:" ni signos de exclamación: "No se pudo guardar el precio. Intenta de nuevo."
- Sistema de toasts (`ToastContext`) para feedback de operaciones asíncronas (éxito, error, advertencia).
- `src/app/error.tsx` como boundary global para errores inesperados de React.
- `HouseholdErrorBanner` para mostrar errores de carga del contexto de hogar.

## 8. Variables de entorno y despliegue

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo en servidor, nunca en el cliente
DATABASE_URL=                # para `prisma migrate`, apunta al Postgres de Supabase
```

Despliegue: frontend en Vercel conectado al repo (variables públicas en el dashboard de Vercel); backend en Supabase Cloud, migraciones aplicadas con `prisma migrate deploy` apuntando a `DATABASE_URL`.

Autenticación: URL del sitio configurada en Supabase → Authentication → URL Configuration → Site URL. Agregar también la URL local (`http://localhost:3000/**`) en Redirect URLs.

## 9. Testing mínimo

Dado el tamaño del proyecto, no se exige suite exhaustiva:
- Toda función pura en `/lib` (`formatListForWhatsApp`, cálculo de totales) lleva al menos un test con Vitest.
- El resto de criterios de aceptación por tarea (sección 11) se verifican manualmente.

## 10. Estructura de carpetas

```
src/
├── app/
│   ├── (app)/
│   │   ├── catalog/page.tsx         # CRUD catálogo de ítems
│   │   ├── dashboard/page.tsx       # Pantalla de inicio
│   │   ├── history/page.tsx         # Historial de listas y precios
│   │   ├── list/
│   │   │   ├── active/page.tsx      # Lista activa (checklist + precios + total)
│   │   │   └── [listId]/page.tsx    # Detalle de lista completada (tipo factura)
│   │   └── layout.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx           # Login y registro
│   │   └── join/[code]/page.tsx     # Redimir invitación
│   ├── error.tsx                    # Error boundary global
│   ├── globals.css                  # Design tokens, fuente Geist
│   ├── layout.tsx                   # Root layout con PWA + toasts
│   └── manifest.ts                  # PWA manifest (Next.js convention)
├── components/
│   ├── app-nav.tsx                  # Navegación principal con Logo
│   ├── household-error-banner.tsx   # Banner de error de contexto de hogar
│   ├── icons.tsx                    # Iconos SVG + Logo
│   ├── ios-install-banner.tsx       # Banner de instalación PWA para iOS
│   ├── service-worker-register.tsx  # Registro del service worker
│   └── ui/
│       ├── alert.tsx                # Alertas (error, success, warning, info)
│       ├── badge.tsx                # CategoryBadge con colores por categoría
│       ├── button.tsx               # Botón con variantes y Spinner integrado
│       ├── empty-state.tsx          # Estado vacío reutilizable
│       ├── input.tsx                # Input con label, error, hint, toggle de contraseña
│       ├── phone-input.tsx          # Input de teléfono con selector de dial code
│       └── spinner.tsx              # Indicador de carga
├── contexts/
│   ├── household-context.tsx        # Estado global del hogar activo
│   └── toast-context.tsx            # Sistema de notificaciones toast
├── lib/
│   ├── cn.ts                        # Utilidad clsx + tailwind-merge
│   ├── supabase/
│   │   ├── client.ts               # Cliente browser
│   │   └── server.ts               # Cliente server (SSR)
│   ├── types.ts                    # Tipos TypeScript
│   ├── validation/
│   │   └── schemas.ts              # Schemas Zod (signInSchema, signUpSchema, etc.)
│   └── whatsapp/
│       ├── format-list.ts          # Formateador de lista para WhatsApp
│       └── format-list.test.ts     # Tests unitarios
├── proxy.ts                        # Middleware de autenticación (Next.js 16)
public/
├── icon-192.png                    # Ícono PWA 192×192
├── icon-512.png                    # Ícono PWA 512×512
└── sw.js                           # Service worker (Network-first + Cache-first)
.github/
├── CODEOWNERS                      # @CarlosVlz1 como dueño de todo el repo
└── PULL_REQUEST_TEMPLATE.md        # Template de PRs
prisma/
└── schema.prisma                   # Esquema Prisma (referencia, no se ejecuta en runtime)
scripts/
└── generate-icons.mjs              # Genera íconos PNG para PWA con Node.js puro
```

## 11. Convenciones para agentes

- Una tarea = un commit atómico.
- TypeScript estricto, sin `any` salvo justificación explícita en el código.
- Ninguna consulta a Supabase se implementa sin que exista antes una política RLS que la cubra.
- `household_id` nunca viene de un input del usuario — siempre del hogar activo en el contexto de sesión.
- El middleware de autenticación vive en `src/proxy.ts` (Next.js 16 renombra `middleware.ts` a `proxy.ts`).
- No usar IIFEs (`{(() => { ... })()}`) dentro de JSX — calcular valores fuera del `return`.

## 12. Tareas atómicas por fase

### Fase 0 — Setup ✅

| ID | Tarea | Estado |
|---|---|---|
| F0-01 | Crear proyecto Supabase y proyecto Next.js | ✅ |
| F0-02 | Definir `schema.prisma` con `@map`/`@@map` en snake_case y migrar | ✅ |
| F0-03 | Configurar Supabase Auth (email/password) | ✅ |
| F0-04 | Escribir políticas RLS base + funciones `SECURITY DEFINER` | ✅ |
| F0-05 | Configurar cliente `supabase-js` (browser y server) | ✅ |
| F0-06 | Configurar variables de entorno y pipeline de despliegue (Vercel) | ✅ |

### Fase 1 — MVP ✅

| ID | Tarea | Estado |
|---|---|---|
| F1-01 | Pantalla de login/registro (nombre, apellido, teléfono, contraseña con checklist) | ✅ |
| F1-02 | Crear hogar (UI + RPC `create_household`) | ✅ |
| F1-03 | Invitar y unirse a hogar (UI + RPC `redeem_household_invite`) | ✅ |
| F1-04 | CRUD de catálogo de ítems | ✅ |
| F1-05 | Vista de checklist semanal con cantidades | ✅ |
| F1-06 | Función `formatListForWhatsApp` + botón compartir (ítems pendientes) | ✅ |

### Fase 2 — Precios ✅

| ID | Tarea | Estado |
|---|---|---|
| F2-01 | Campo de precio editable por ítem de lista (debounced) | ✅ |
| F2-02 | Registrar en `price_history` al cerrar la lista | ✅ |
| F2-03 | Total estimado en tiempo real desde `priceInputs` | ✅ |
| F2-04 | Persistir total en `shopping_lists.total` al cerrar | ✅ |
| F2-05 | Historial: acordeón con subtotales por ítem y total por lista | ✅ |
| F2-06 | Detalle de lista completada tipo factura (`/list/[listId]`) | ✅ |

### Fase 3 — Tiempo real

| ID | Tarea | Estado |
|---|---|---|
| F3-01 | Suscripción Realtime a `shopping_list_items` de la lista activa | ⬜ pendiente |
| F3-02 | Indicador de quién marcó cada ítem | ⬜ pendiente |

### Fase 4 — Inteligencia y PWA

| ID | Tarea | Estado |
|---|---|---|
| F4-01 | Edge Function de sugerencias por frecuencia de compra | ⬜ pendiente |
| F4-02 | Gráfico de historial de precios por ítem | ⬜ pendiente |
| F4-03 | Manifest, service worker e íconos (PWA instalable) | ✅ |
