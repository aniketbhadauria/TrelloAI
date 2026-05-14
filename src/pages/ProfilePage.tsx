import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useProfile } from '@/context/ProfileContext'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getUserInitials } from '@/utils/user'
import { PROFILE_SCHEMA, ProfileFormData } from '@/schemas/profile'
import ProfileAvatarEditor from '@/features/profile/ProfileAvatarEditor'
import ProfileFormFields from '@/features/profile/ProfileFormFields'

export default function ProfilePage() {
  usePageTitle('Edit Profile')
  const navigate = useNavigate()
  const { profile, saveProfile, uploadAvatar } = useProfile()

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({ resolver: zodResolver(PROFILE_SCHEMA) })

  useEffect(() => {
    if (!profile) return
    reset({
      firstName: profile.first_name ?? '',
      lastName: profile.last_name ?? '',
      dob: profile.date_of_birth ?? '',
      gender: profile.gender === 'male' || profile.gender === 'female' ? profile.gender : undefined,
      phone: profile.phone ?? '',
      country: profile.country ?? '',
    })
    if (profile.avatar_url) setAvatarPreview(profile.avatar_url)
  }, [profile, reset])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (data: ProfileFormData) => {
    setSubmitError('')
    try {
      let avatarUrl = profile?.avatar_url ?? undefined
      if (avatarFile) avatarUrl = await uploadAvatar(avatarFile)
      await saveProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: `${data.firstName} ${data.lastName}`,
        date_of_birth: data.dob,
        gender: data.gender,
        phone: data.phone,
        country: data.country,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      })
      navigate(-1)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const watchFirstName = watch('firstName')
  const watchLastName = watch('lastName')
  const initials = getUserInitials(
    `${watchFirstName || ''} ${watchLastName || ''}`.trim(),
    profile?.email
  )

  return (
    <div className="max-w-xl mx-auto px-6 py-10 page-enter">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Profile</h1>
        <div className="h-px flex-1 bg-border/40 mx-6 hidden sm:block" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <ProfileAvatarEditor
          id={profile?.id}
          preview={avatarPreview}
          initials={initials}
          onFileChange={handleFileChange}
        />

        <ProfileFormFields register={register} errors={errors} />

        {submitError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium text-center">
            ⚠️ {submitError}
          </div>
        )}

        <div className="flex gap-4 pt-4 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 h-12"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-bold"
            disabled={isSubmitting || (!isDirty && !avatarFile)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
