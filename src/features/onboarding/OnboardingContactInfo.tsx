import { UseFormRegister, FieldErrors } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { COUNTRIES, GENDERS, SELECT_CLS } from '@/utils/constants'
import { ProfileFormData } from '@/schemas/profile'

interface OnboardingContactInfoProps {
  register: UseFormRegister<ProfileFormData>
  errors: FieldErrors<ProfileFormData>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1 animate-slide-down">⚠️ {message}</p>
}

export default function OnboardingContactInfo({ register, errors }: OnboardingContactInfoProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ob-dob">Date of birth</Label>
          <Input
            id="ob-dob"
            type="date"
            className="h-10 focus:ring-primary/20"
            {...register('dob')}
          />
          <FieldError message={errors.dob?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ob-gender">Gender</Label>
          <select id="ob-gender" className={SELECT_CLS} {...register('gender')}>
            <option value="">Select…</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.gender?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ob-phone">Phone number</Label>
          <Input
            id="ob-phone"
            type="tel"
            placeholder="+1 555 000 0000"
            autoComplete="tel"
            className="h-10 focus:ring-primary/20"
            {...register('phone')}
          />
          <FieldError message={errors.phone?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ob-country">Country</Label>
          <select id="ob-country" className={SELECT_CLS} {...register('country')}>
            <option value="">Select…</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FieldError message={errors.country?.message} />
        </div>
      </div>
    </div>
  )
}
