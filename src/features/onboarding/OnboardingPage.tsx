import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/context/ProfileContext'
import { Button } from '@/components/ui/button'
import { LogoFull } from '@/components/Logo'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getUserInitials } from '@/utils/user'
import { PROFILE_SCHEMA, ProfileFormData } from '@/schemas/profile'
import OnboardingStepIndicator, { STEPS } from './OnboardingStepIndicator'
import OnboardingPersonalInfo from './OnboardingPersonalInfo'
import OnboardingContactInfo from './OnboardingContactInfo'
import OnboardingAvatarUpload from './OnboardingAvatarUpload'

const STEP_FIELDS: (keyof ProfileFormData)[][] = [
  ['firstName', 'lastName'],
  ['dob', 'gender', 'phone', 'country'],
  [],
]

export default function OnboardingPage() {
  usePageTitle('Complete Your Profile')
  const { user } = useAuth()
  const { isComplete, saveProfile, uploadAvatar } = useProfile()

  const [step, setStep] = useState(0)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({ resolver: zodResolver(PROFILE_SCHEMA), mode: 'onTouched' })

  if (isComplete) return <Navigate to="/boards" replace />

  const firstName = watch('firstName')
  const lastName = watch('lastName')
  const initials = getUserInitials(`${firstName || ''} ${lastName || ''}`.trim(), user?.email)
  const currentStep = STEPS[step]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarError('')
  }

  const goNext = async () => {
    const fields = STEP_FIELDS[step] as (keyof ProfileFormData)[]
    const valid = await trigger(fields)
    if (valid) setStep((s) => s + 1)
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!avatarFile) {
      setAvatarError('Please upload a profile photo.')
      return
    }
    setSubmitError('')
    try {
      const avatarUrl = await uploadAvatar(avatarFile)
      await saveProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: `${data.firstName} ${data.lastName}`,
        date_of_birth: data.dob,
        gender: data.gender,
        phone: data.phone,
        country: data.country,
        avatar_url: avatarUrl,
        onboarding_completed: true,
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-10">
        <LogoFull className="h-6 text-primary" />
      </div>

      <div className="w-full max-w-lg bg-card border border-border/50 rounded-2xl shadow-xl p-8 backdrop-blur-sm text-card-foreground">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 animate-bounce-slow">{currentStep.emoji}</div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 text-foreground">
            {currentStep.label}
          </h1>
          <p className="text-sm text-muted-foreground">{currentStep.hint}</p>
        </div>

        <OnboardingStepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 0 && <OnboardingPersonalInfo register={register} errors={errors} />}

          {step === 1 && <OnboardingContactInfo register={register} errors={errors} />}

          {step === 2 && (
            <OnboardingAvatarUpload
              userId={user?.id}
              preview={avatarPreview}
              initials={initials}
              error={avatarError}
              onFileChange={handleFileChange}
            />
          )}

          {submitError && (
            <div
              className="p-3 mt-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center font-medium"
              role="alert"
            >
              ⚠️ {submitError}
            </div>
          )}

          <div className="flex justify-between pt-6 gap-3">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 h-11 font-semibold"
              >
                ← Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={goNext}
                className={`flex-1 h-11 shadow-lg shadow-primary/20 font-bold ${step === 0 ? 'ml-auto max-w-[200px]' : ''}`}
              >
                Continue →
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1 h-11 shadow-lg shadow-primary/20 font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  'Complete Profile'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>

      <p className="mt-8 text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">
        Esperia Studio · Internal System
      </p>
    </div>
  )
}
