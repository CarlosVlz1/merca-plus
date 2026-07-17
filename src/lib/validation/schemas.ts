import { z } from 'zod'

export const signUpSchema = z
  .object({
    fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
    phone: z
      .string()
      .regex(/^[0-9\s]{6,15}$/, 'Número inválido')
      .optional()
      .or(z.literal('')),
    email: z.string().email('Correo inválido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
      .regex(/[0-9]/, 'Debe incluir al menos un número'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const signInSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

export const householdSchema = z.object({
  name: z.string().min(1, 'El nombre del hogar es requerido').max(100),
})

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .length(8, 'El código debe tener 8 caracteres')
    .regex(/^[a-zA-Z0-9]+$/, 'Código inválido'),
})

export const itemSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  category: z.string().min(1, 'La categoría es requerida').max(50),
  unit: z.string().max(20).optional(),
})

export const shoppingListItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z
    .number()
    .positive('La cantidad debe ser mayor a 0')
    .multipleOf(0.01, 'Máximo 2 decimales'),
  price: z
    .number()
    .min(0, 'El precio no puede ser negativo')
    .multipleOf(0.01, 'Máximo 2 decimales')
    .optional(),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type HouseholdInput = z.infer<typeof householdSchema>
export type InviteCodeInput = z.infer<typeof inviteCodeSchema>
export type ItemInput = z.infer<typeof itemSchema>
export type ShoppingListItemInput = z.infer<typeof shoppingListItemSchema>
