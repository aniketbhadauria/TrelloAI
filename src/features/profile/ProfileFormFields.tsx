import { UseFormRegister, FieldErrors } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { COUNTRIES, GENDERS, SELECT_CLS } from '@/utils/constants'
import { ProfileFormData } from '@/schemas/profile'

interface ProfileFormFieldsProps {
  register: UseFormRegister<ProfileFormData>
  errors: FieldErrors<ProfileFormData>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1 animate-slide-down">⚠️ {message}</p>
}

export default function ProfileFormFields({ register, errors }: ProfileFormFieldsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="p-first"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            First name
          </Label>
          <Input
            id="p-first"
            autoComplete="given-name"
            {...register('firstName')}
            className="h-11 focus:ring-primary/20"
          />
          <FieldError message={errors.firstName?.message} />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="p-last"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Last name
          </Label>
          <Input
            id="p-last"
            autoComplete="family-name"
            {...register('lastName')}
            className="h-11 focus:ring-primary/20"
          />
          <FieldError message={errors.lastName?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="p-dob"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Date of birth
          </Label>
          <Input
            id="p-dob"
            type="date"
            {...register('dob')}
            className="h-11 focus:ring-primary/20"
          />
          <FieldError message={errors.dob?.message} />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="p-gender"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Gender
          </Label>
          <select id="p-gender" className={SELECT_CLS} {...register('gender')}>
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
          <Label
            htmlFor="p-phone"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Phone number
          </Label>
          <Input
            id="p-phone"
            type="tel"
            autoComplete="tel"
            {...register('phone')}
            className="h-11 focus:ring-primary/20"
          />
          <FieldError message={errors.phone?.message} />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="p-country"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Country
          </Label>
          <select id="p-country" className={SELECT_CLS} {...register('country')}>
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
