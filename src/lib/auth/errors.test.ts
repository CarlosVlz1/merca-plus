import { describe, it, expect } from 'vitest'
import { mapAuthError } from './errors'

describe('mapAuthError', () => {
  it('returns default message for undefined error code', () => {
    expect(mapAuthError(undefined)).toBe('No se pudo completar la acción. Intenta de nuevo.')
  })

  it('returns default message for unknown error code', () => {
    expect(mapAuthError('unknown_error_code')).toBe('No se pudo completar la acción. Intenta de nuevo.')
  })

  it('maps user_already_exists to correct Spanish message', () => {
    expect(mapAuthError('user_already_exists')).toBe('Ese correo ya tiene una cuenta. Intenta iniciar sesión.')
  })

  it('maps email_address_already_authorized to correct Spanish message', () => {
    expect(mapAuthError('email_address_already_authorized')).toBe('Ese correo ya tiene una cuenta. Intenta iniciar sesión.')
  })

  it('maps invalid_credentials to correct Spanish message', () => {
    expect(mapAuthError('invalid_credentials')).toBe('Correo o contraseña incorrectos.')
  })

  it('maps email_not_confirmed to correct Spanish message', () => {
    expect(mapAuthError('email_not_confirmed')).toBe('Correo o contraseña incorrectos.')
  })

  it('maps auth_callback_failed to correct Spanish message', () => {
    expect(mapAuthError('auth_callback_failed')).toBe('No se pudo verificar tu correo. Intenta registrarte de nuevo.')
  })

  it('maps session_exchange_failed to correct Spanish message', () => {
    expect(mapAuthError('session_exchange_failed')).toBe('El enlace de confirmación expiró. Intenta registrarte de nuevo.')
  })

  it('maps missing_code to correct Spanish message', () => {
    expect(mapAuthError('missing_code')).toBe('El enlace de confirmación es inválido.')
  })

  it('maps unexpected_error to correct Spanish message', () => {
    expect(mapAuthError('unexpected_error')).toBe('Ocurrió un error inesperado. Intenta de nuevo.')
  })

  describe('ensures all messages are user-friendly', () => {
    const testCases = [
      'user_already_exists',
      'auth_callback_failed',
      'session_exchange_failed',
    ]

    testCases.forEach((errorCode) => {
      it(`message for ${errorCode} does not contain technical jargon`, () => {
        const message = mapAuthError(errorCode)
        // Should not contain programming/debugging terms
        expect(message).not.toMatch(/exception/i)
        expect(message).not.toMatch(/null/i)
        expect(message).not.toMatch(/undefined/i)
        expect(message).not.toMatch(/callback/i)
        expect(message).not.toMatch(/session/i)
      })

      it(`message for ${errorCode} is in Spanish`, () => {
        const message = mapAuthError(errorCode)
        // Check for Spanish-specific characters or common words
        const spanishIndicators = /[áéíóúñ]|intenta|correo|cuenta|sesión|enlace/i
        expect(message).toMatch(spanishIndicators)
      })

      it(`message for ${errorCode} provides actionable guidance`, () => {
        const message = mapAuthError(errorCode)
        // Should mention what to do next
        const actionableWords = /intenta|revisa|verifica|nuevo|nuevamente/i
        expect(message).toMatch(actionableWords)
      })
    })

    it('invalid_credentials message is clear and concise', () => {
      const message = mapAuthError('invalid_credentials')
      expect(message).toBe('Correo o contraseña incorrectos.')
      expect(message.length).toBeLessThan(100)
    })

    it('missing_code message is clear and concise', () => {
      const message = mapAuthError('missing_code')
      expect(message).toBe('El enlace de confirmación es inválido.')
      expect(message.length).toBeLessThan(100)
    })

    it('unexpected_error message is user-friendly despite containing "error"', () => {
      const message = mapAuthError('unexpected_error')
      expect(message).toBe('Ocurrió un error inesperado. Intenta de nuevo.')
      // "Error" in Spanish is acceptable for users
      expect(message).toMatch(/intenta/i)
    })
  })
})
