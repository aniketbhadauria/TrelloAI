import { UseFormRegister, FieldErrors } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { ProfileFormData } from '@/schemas/profile'

interface OnboardingPersonalInfoProps {
  register: UseFormRegister<ProfileFormData>
  errors: FieldErrors<ProfileFormData>
}

export default function OnboardingPersonalInfo({ register, errors }: OnboardingPersonalInfoProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 gap-4">
        <FormField name="firstName" label="First name" error={errors.firstName}>
          <Input
            autoComplete="given-name"
            className="h-10 focus:ring-primary/20"
            {...register('firstName')}
            autoFocus
          />
        </FormField>
        <FormField name="lastName" label="Last name" error={errors.lastName}>
          <Input
            autoComplete="family-name"
            className="h-10 focus:ring-primary/20"
            {...register('lastName')}
          />
        </FormField>
      </div>
    </div>
  )
}
