import { UseFormRegister, FieldErrors } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { COUNTRIES, GENDERS, SELECT_CLS } from '@/utils/constants'
import { ProfileFormData } from '@/schemas/profile'

interface OnboardingContactInfoProps {
  register: UseFormRegister<ProfileFormData>
  errors: FieldErrors<ProfileFormData>
}

export default function OnboardingContactInfo({ register, errors }: OnboardingContactInfoProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 gap-4">
        <FormField name="dob" label="Date of birth" error={errors.dob}>
          <Input type="date" className="h-10 focus:ring-primary/20" {...register('dob')} />
        </FormField>
        <FormField name="gender" label="Gender" error={errors.gender}>
          <select className={SELECT_CLS} {...register('gender')}>
            <option value="">Select…</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField name="phone" label="Phone number" error={errors.phone}>
          <Input
            type="tel"
            placeholder="+1 555 000 0000"
            autoComplete="tel"
            className="h-10 focus:ring-primary/20"
            {...register('phone')}
          />
        </FormField>
        <FormField name="country" label="Country" error={errors.country}>
          <select className={SELECT_CLS} {...register('country')}>
            <option value="">Select…</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </div>
  )
}
