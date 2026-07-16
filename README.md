# Merca+ 🛒

App móvil para organizar las compras del hogar. Permite crear listas de mercado, registrar precios pagados y ver el historial de precios por producto.

## Funcionalidades

- **Autenticación** — registro e inicio de sesión con Supabase Auth
- **Hogares** — crea tu hogar e invita a otros miembros con un enlace
- **Catálogo** — define los productos que compras habitualmente (nombre, categoría, unidad, precio de referencia)
- **Lista activa** — arma la lista semanal desde el catálogo, ajusta cantidades, anota precios y comparte por WhatsApp
- **Finalizar lista** — guarda los precios en el historial y archiva la lista
- **Historial** — revisa listas anteriores y el historial de precios por producto

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Backend | Supabase (Postgres, Auth, RLS) |
| ORM / Schema | Prisma v6 (solo para referencia y migraciones) |
| Package manager | pnpm |
| Tests | Vitest |

## Configuración local

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Variables de entorno

Crea un archivo `.env.local` en la raíz con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATABASE_URL=postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres
```

### 3. Base de datos

El esquema está en `prisma/schema.prisma`. Para aplicarlo a Supabase ejecuta en el SQL Editor:

```bash
# Genera el SQL de migración
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

Pega la salida en el SQL Editor de Supabase junto con las políticas RLS (ver `documentacion-agentes-mercado-hogar_1.md`).

### 4. Correr en desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 5. Tests

```bash
pnpm test
```

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/          # Rutas protegidas (dashboard, lista, catálogo, historial)
│   └── (auth)/         # Rutas públicas (login, join)
├── components/
│   ├── app-nav.tsx     # Barra de navegación
│   ├── icons.tsx       # Iconos SVG
│   └── ui/             # Componentes reutilizables (Button, Input, Alert, etc.)
├── contexts/
│   └── household-context.tsx  # Estado global del hogar activo
├── lib/
│   ├── supabase/       # Clientes Supabase (client / server)
│   ├── types.ts        # Tipos TypeScript
│   ├── validation/     # Schemas Zod
│   └── whatsapp/       # Formateador de lista para WhatsApp
└── proxy.ts            # Middleware de autenticación (Next.js 16)
```

## Despliegue

Recomendado en [Vercel](https://vercel.com). Agrega las variables de entorno en el panel de Vercel y conecta el repositorio.
