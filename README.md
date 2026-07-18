# Merca+ 🛒

App móvil (PWA) para organizar las compras del hogar. Permite crear listas de mercado, registrar precios pagados, ver el historial de precios por producto y compartir pendientes por WhatsApp.

## Funcionalidades

- **Autenticación** — registro (nombre, apellido, teléfono) e inicio de sesión con Supabase Auth
- **Hogares** — crea tu hogar e invita a otros miembros con un enlace único
- **Catálogo** — define los productos que compras habitualmente (nombre, categoría, unidad, precio de referencia)
- **Lista activa** — arma la lista desde el catálogo, ajusta cantidades, anota precios y ve el total estimado en tiempo real
- **Finalizar lista** — guarda precios en el historial y archiva la lista con su total
- **Historial** — revisa listas anteriores (acordeón con subtotales) y el historial de precios por producto
- **Detalle de lista** — vista tipo factura de cada compra completada (`/list/[listId]`)
- **Compartir por WhatsApp** — genera texto con los ítems pendientes listo para enviar
- **Insights** — métricas de gasto mensual, evolución de precios por producto y desglose por categoría (gráficas SVG)
- **PWA** — instalable en Android e iOS, con service worker para carga offline

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Backend | Supabase (Postgres, Auth, RLS) |
| ORM / Schema | Prisma v6 (referencia y migraciones) |
| Package manager | pnpm |
| Tests | Vitest |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) |

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

Pega la salida en el SQL Editor de Supabase junto con las políticas RLS (ver `documentacion-agentes-mercado-hogar_1.md`, sección 4).

### 4. Correr en desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 5. Generar íconos PWA

```bash
node scripts/generate-icons.mjs
```

Genera `public/icon-192.png` y `public/icon-512.png`.

### 6. Tests

```bash
pnpm test
```

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/
│   │   ├── catalog/        # CRUD catálogo de ítems
│   │   ├── insights/       # Dashboard de métricas financieras
│   │   ├── dashboard/      # Pantalla de inicio
│   │   ├── history/        # Historial de listas y precios
│   │   └── list/
│   │       ├── active/     # Lista activa (checklist, precios, total en tiempo real)
│   │       └── [listId]/   # Detalle de lista completada (tipo factura)
│   ├── (auth)/
│   │   ├── login/          # Login y registro
│   │   └── join/[code]/    # Redimir invitación de hogar
│   ├── error.tsx           # Error boundary global
│   ├── globals.css         # Design tokens y fuente Geist
│   ├── layout.tsx          # Root layout (PWA + toasts)
│   └── manifest.ts         # PWA manifest
├── components/
│   ├── app-nav.tsx         # Navegación principal
│   ├── icons.tsx           # Iconos SVG + Logo
│   ├── ios-install-banner.tsx
│   ├── service-worker-register.tsx
│   └── ui/                 # Button, Input, Alert, Spinner, EmptyState, Badge, PhoneInput
├── contexts/
│   ├── household-context.tsx
│   └── toast-context.tsx   # Sistema global de toasts
├── lib/
│   ├── cn.ts
│   ├── supabase/           # Clientes browser y server
│   ├── types.ts
│   ├── validation/         # Schemas Zod
│   └── whatsapp/           # Formateador de lista para WhatsApp
└── proxy.ts                # Middleware de autenticación (Next.js 16)
public/
├── icon-192.png
├── icon-512.png
└── sw.js                   # Service worker
.github/
├── CODEOWNERS
└── PULL_REQUEST_TEMPLATE.md
```

## Despliegue

Recomendado en [Vercel](https://vercel.com). Agrega las variables de entorno en el panel de Vercel y conecta el repositorio.

En Supabase → Authentication → URL Configuration:
- **Site URL**: `https://merca-plus.vercel.app`
- **Redirect URLs**: `https://merca-plus.vercel.app/**` y `http://localhost:3000/**`
