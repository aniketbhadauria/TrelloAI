import { UseFormRegister, FieldErrors } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { COUNTRIES, GENDERS, SELECT_CLS } from '@/utils/constants'
import { ProfileFormData } from '@/schemas/profile'

const LABEL_CLS = 'text-xs font-bold uppercase tracking-wider text-muted-foreground'

interface ProfileFormFieldsProps {
  register: UseFormRegister<ProfileFormData>
  errors: FieldErrors<ProfileFormData>
}

export default function ProfileFormFields({ register, errors }: ProfileFormFieldsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="firstName"
          label="First name"
          error={errors.firstName}
          labelClassName={LABEL_CLS}
        >
          <Input
            autoComplete="given-name"
            {...register('firstName')}
            className="h-11 focus:ring-primary/20"
          />
        </FormField>
        <FormField
          name="lastName"
          label="Last name"
          error={errors.lastName}
          labelClassName={LABEL_CLS}
        >
          <Input
            autoComplete="family-name"
            {...register('lastName')}
            className="h-11 focus:ring-primary/20"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField name="dob" label="Date of birth" error={errors.dob} labelClassName={LABEL_CLS}>
          <Input type="date" {...register('dob')} className="h-11 focus:ring-primary/20" />
        </FormField>
        <FormField name="gender" label="Gender" error={errors.gender} labelClassName={LABEL_CLS}>
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
        <FormField
          name="phone"
          label="Phone number"
          error={errors.phone}
          labelClassName={LABEL_CLS}
        >
          <Input
            type="tel"
            autoComplete="tel"
            {...register('phone')}
            className="h-11 focus:ring-primary/20"
          />
        </FormField>
        <FormField name="country" label="Country" error={errors.country} labelClassName={LABEL_CLS}>
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
