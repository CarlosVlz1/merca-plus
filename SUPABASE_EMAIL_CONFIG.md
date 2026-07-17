# Configuración de Email en Supabase para Verificación de Usuarios

## Problema Identificado

El flujo de registro desde móvil no estaba enviando correos de verificación debido a:

1. **Falta de URL de redirección**: La función `signUp` no incluía el parámetro `emailRedirectTo`
2. **Falta de ruta de callback**: No existía un endpoint para procesar la confirmación de email
3. **Posible configuración incorrecta en Supabase**: Las URLs de redirección permitidas podrían no estar configuradas

## Cambios Implementados en el Código

### 1. Nueva Ruta de Callback (`/src/app/auth/callback/route.ts`)

Se creó un endpoint que procesa el código de confirmación enviado por Supabase:

```typescript
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Redirige al usuario autenticado al dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
```

### 2. Actualización del Flujo de Registro

Se modificó `/src/app/(auth)/login/page.tsx` para incluir la URL de redirección:

```typescript
const origin = typeof window !== 'undefined' ? window.location.origin : ''
const { error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
    data: {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
    },
  },
})
```

### 3. Actualización del Middleware

Se actualizó `/src/proxy.ts` para permitir acceso sin autenticación a la ruta de callback:

```typescript
const isAuthPath =
  request.nextUrl.pathname.startsWith('/login') ||
  request.nextUrl.pathname.startsWith('/join') ||
  request.nextUrl.pathname.startsWith('/auth/callback')
```

## Configuración Requerida en Supabase Dashboard

Para que los correos de verificación funcionen correctamente, debes verificar y configurar lo siguiente en tu proyecto de Supabase:

### 1. URLs de Redirección Permitidas

Ve a **Authentication → URL Configuration** en el dashboard de Supabase y agrega las siguientes URLs:

**Para desarrollo local:**
```
http://localhost:3000/auth/callback
```

**Para producción:**
```
https://tu-dominio.com/auth/callback
https://tu-dominio.vercel.app/auth/callback
```

⚠️ **IMPORTANTE**: Sin estas URLs configuradas, Supabase bloqueará las redirecciones y los correos no se enviarán o los enlaces no funcionarán.

### 2. Verificar Email Templates

Ve a **Authentication → Email Templates** y verifica:

#### Template: "Confirm signup"

Asegúrate de que el template use la variable `{{ .ConfirmationURL }}` correctamente:

```html
<h2>Confirma tu correo</h2>
<p>Haz clic en el siguiente enlace para confirmar tu cuenta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi cuenta</a></p>
```

### 3. Configuración de SMTP (Opcional pero Recomendado)

Por defecto, Supabase usa su propio servidor SMTP con límites de envío. Para producción, es recomendable configurar tu propio SMTP:

Ve a **Project Settings → Auth → SMTP Settings**:

```
SMTP Host: smtp.tu-proveedor.com
SMTP Port: 587
Sender email: noreply@tu-dominio.com
Sender name: Merca+
Enable email confirmations: ✓
```

Proveedores SMTP recomendados:
- **SendGrid**: 100 correos/día gratis
- **Mailgun**: 5000 correos/mes gratis
- **Amazon SES**: Muy económico para alto volumen
- **Resend**: API moderna y sencilla

### 4. Verificar Confirmación de Email Está Habilitada

Ve a **Authentication → Providers → Email**:

- ✓ **Enable email provider**
- ✓ **Confirm email** (debe estar activado)
- Opcional: **Secure email change** (recomendado para producción)

### 5. Site URL

Ve a **Authentication → URL Configuration**:

Asegúrate de que la **Site URL** esté configurada correctamente:

**Desarrollo:**
```
http://localhost:3000
```

**Producción:**
```
https://tu-dominio.com
```

## Verificación del Flujo

Para probar que todo funciona correctamente:

1. **Registra un nuevo usuario** desde el móvil o navegador
2. **Verifica que aparezca el mensaje**: "¡Revisa tu correo!"
3. **Revisa la bandeja de entrada** (y spam) del correo registrado
4. **Haz clic en el enlace** del correo
5. **Verifica que redirige a** `/auth/callback` y luego a `/dashboard`
6. **Verifica que el usuario puede iniciar sesión** normalmente

## Debugging

Si los correos siguen sin llegar:

### 1. Revisa los Logs de Supabase

Ve a **Logs → Auth Logs** en el dashboard y busca:
- Errores de envío de email
- Errores de configuración de URL
- Intentos de registro fallidos

### 2. Prueba con la API Directamente

```bash
curl -X POST 'https://TU_PROYECTO.supabase.co/auth/v1/signup' \
-H "apikey: TU_ANON_KEY" \
-H "Content-Type: application/json" \
-d '{
  "email": "test@example.com",
  "password": "Test123!",
  "options": {
    "emailRedirectTo": "https://tu-dominio.com/auth/callback"
  }
}'
```

### 3. Verifica Variables de Entorno

Asegúrate de que estén correctamente configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Modo de Desarrollo: Deshabilitar Confirmación Temporal

Si necesitas probar sin emails (solo para desarrollo), puedes desactivar temporalmente la confirmación:

**Authentication → Providers → Email**:
- ✗ Desmarcar "Confirm email"

⚠️ **NO usar en producción** - todos los usuarios podrían registrarse sin validación.

## Problemas Específicos de Móviles

### Deep Links en iOS/Android

Si estás usando una PWA o app nativa, es posible que necesites configurar deep links:

1. **iOS**: Configura Associated Domains en tu archivo `.well-known/apple-app-site-association`
2. **Android**: Configura App Links en tu `AndroidManifest.xml`

Para PWA, los links normales HTTP/HTTPS deberían funcionar sin configuración adicional.

### Redirección desde Email en Móvil

Algunos clientes de email en móvil abren los links en un navegador embebido. Asegúrate de:

- Usar HTTPS en producción (Vercel lo hace automáticamente)
- Probar con diferentes clientes de email (Gmail, Outlook, Apple Mail)
- Verificar que el navegador embebido pueda acceder a cookies

## Resumen

✅ **Cambios implementados en el código**
✅ **Ruta de callback creada en** `/auth/callback`
✅ **EmailRedirectTo agregado al signup**
✅ **Middleware actualizado**

📋 **Pendiente - Configuración en Supabase:**
- [ ] Agregar URLs de redirección permitidas
- [ ] Verificar template de email de confirmación
- [ ] Configurar SMTP personalizado (recomendado)
- [ ] Verificar que "Confirm email" está activado
- [ ] Configurar Site URL correctamente

Una vez completada la configuración en Supabase, los usuarios deberían recibir correos de verificación correctamente tanto desde desktop como desde móvil.
