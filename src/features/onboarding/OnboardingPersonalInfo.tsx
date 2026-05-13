import { UseFormRegister, FieldErrors } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ProfileFormData } from '@/schemas/profile'

interface OnboardingPersonalInfoProps {
  register: UseFormRegister<ProfileFormData>
  errors: FieldErrors<ProfileFormData>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1 animate-slide-down">⚠️ {message}</p>
}

export default function OnboardingPersonalInfo({ register, errors }: OnboardingPersonalInfoProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ob-first">First name</Label>
          <Input
            id="ob-first"
            autoComplete="given-name"
            className="h-10 focus:ring-primary/20"
            {...register('firstName')}
            autoFocus
          />
          <FieldError message={errors.firstName?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ob-last">Last name</Label>
          <Input
            id="ob-last"
            autoComplete="family-name"
            className="h-10 focus:ring-primary/20"
            {...register('lastName')}
          />
          <FieldError message={errors.lastName?.message} />
        </div>
      </div>
    </div>
  )
}
