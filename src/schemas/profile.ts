import { z } from 'zod'

export const PROFILE_SCHEMA = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  dob: z.string().min(1, 'Required'),
  gender: z.enum(['male', 'female'], { message: 'Select a gender' }),
  phone: z.string().min(1, 'Required'),
  country: z.string().min(1, 'Required'),
})

export type ProfileFormData = z.infer<typeof PROFILE_SCHEMA>
