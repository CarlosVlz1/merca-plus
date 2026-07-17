/**
 * Mapea códigos de error de Supabase Auth a mensajes amigables en español
 * 
 * @param code - Código de error de Supabase o del callback de auth
 * @returns Mensaje de error amigable para mostrar al usuario
 */
export function mapAuthError(code: string | undefined): string {
  if (!code) {
    return 'No se pudo completar la acción. Intenta de nuevo.'
  }

  switch (code) {
    case 'user_already_exists':
    case 'email_address_already_authorized':
      return 'Ese correo ya tiene una cuenta. Intenta iniciar sesión.'
    
    case 'invalid_credentials':
    case 'email_not_confirmed':
      return 'Correo o contraseña incorrectos.'
    
    case 'auth_callback_failed':
      return 'No se pudo verificar tu correo. Intenta registrarte de nuevo.'
    
    case 'session_exchange_failed':
      return 'El enlace de confirmación expiró. Intenta registrarte de nuevo.'
    
    case 'missing_code':
      return 'El enlace de confirmación es inválido.'
    
    case 'unexpected_error':
      return 'Ocurrió un error inesperado. Intenta de nuevo.'
    
    default:
      return 'No se pudo completar la acción. Intenta de nuevo.'
  }
}
