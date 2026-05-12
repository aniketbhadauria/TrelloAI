import { Fragment, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LogoFull } from '@/components/Logo';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Profile } from '@/types/profile';

/* ── constants ─────────────────────────────────────────────────────────── */

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Australia','Austria',
  'Bahrain','Bangladesh','Belgium','Brazil','Canada','Chile','China',
  'Colombia','Croatia','Czech Republic','Denmark','Egypt','Finland',
  'France','Germany','Greece','Hungary','India','Indonesia','Iran',
  'Iraq','Ireland','Israel','Italy','Japan','Jordan','Kazakhstan',
  'Kenya','Kuwait','Lebanon','Malaysia','Mexico','Morocco','Netherlands',
  'New Zealand','Nigeria','Norway','Oman','Pakistan','Peru','Philippines',
  'Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia',
  'Singapore','South Africa','South Korea','Spain','Sri Lanka','Sweden',
  'Switzerland','Thailand','Tunisia','Turkey','Ukraine',
  'United Arab Emirates','United Kingdom','United States','Venezuela','Vietnam',
].sort();

const GENDERS: { value: NonNullable<Profile['gender']>; label: string }[] = [
  { value: 'male',              label: 'Male' },
  { value: 'female',            label: 'Female' },
  { value: 'non_binary',        label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const STEPS = [
  { label: 'Personal details',   emoji: '👋', hint: "Let's start with the basics" },
  { label: 'Contact & location', emoji: '📍', hint: 'So your team can reach you' },
  { label: 'Profile photo',      emoji: '🖼️', hint: 'Put a face to the name' },
] as const;

/* ── zod schema ─────────────────────────────────────────────────────────── */

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  dob:       z.string().min(1, 'Required'),
  gender:    z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say'], {
    message: 'Select a gender',
  }),
  phone:   z.string().min(1, 'Required'),
  country: z.string().min(1, 'Required'),
});
type OnboardingForm = z.infer<typeof schema>;

const STEP_FIELDS: (keyof OnboardingForm)[][] = [
  ['firstName', 'lastName'],
  ['dob', 'gender', 'phone', 'country'],
  [],
];

/* ── sub-components ─────────────────────────────────────────────────────── */

const SELECT_CLS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-2 disabled:opacity-50';

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((step, i) => (
        <Fragment key={step.label}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < current
                ? 'bg-primary text-primary-foreground'
                : i === current
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                : 'bg-secondary text-muted-foreground'
            }`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[11px] font-medium whitespace-nowrap ${
              i === current ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-3 mb-5 transition-all duration-300 ${
              i < current ? 'bg-primary' : 'bg-border'
            }`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

/* ── main component ─────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  usePageTitle('Complete Your Profile');
  const { user } = useAuth();
  const { isComplete, saveProfile, uploadAvatar } = useProfile();

  const [step, setStep] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingForm>({ resolver: zodResolver(schema), mode: 'onTouched' });

  if (isComplete) return <Navigate to="/boards" replace />;

  const initials = (user?.email?.[0] ?? '?').toUpperCase();
  const currentStep = STEPS[step];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarError('');
  }

  async function goNext() {
    const valid = await trigger(STEP_FIELDS[step] as (keyof OnboardingForm)[]);
    if (valid) setStep(s => s + 1);
  }

  const onSubmit = async (data: OnboardingForm) => {
    if (!avatarFile) { setAvatarError('Please upload a profile photo.'); return; }
    setSubmitError('');
    try {
      const avatarUrl = await uploadAvatar(avatarFile);
      await saveProfile({
        first_name:   data.firstName,
        last_name:    data.lastName,
        display_name: `${data.firstName} ${data.lastName}`,
        date_of_birth: data.dob,
        gender:        data.gender,
        phone:         data.phone,
        country:       data.country,
        avatar_url:    avatarUrl,
        onboarding_completed: true,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-10">
        <LogoFull className="h-6 text-primary" />
      </div>

      <div className="w-full max-w-lg bg-card border border-border/50 rounded-2xl shadow-sm p-8">
        {/* Step header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">{currentStep.emoji}</div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">{currentStep.label}</h1>
          <p className="text-sm text-muted-foreground">{currentStep.hint}</p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ── Step 0: Personal ────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-first">First name</Label>
                  <Input id="ob-first" autoComplete="given-name" className="h-10"
                    {...register('firstName')} autoFocus />
                  <FieldError message={errors.firstName?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-last">Last name</Label>
                  <Input id="ob-last" autoComplete="family-name" className="h-10"
                    {...register('lastName')} />
                  <FieldError message={errors.lastName?.message} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={goNext} className="px-8">
                  Continue →
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 1: Contact ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-dob">Date of birth 🎂</Label>
                  <Input id="ob-dob" type="date" className="h-10" {...register('dob')} />
                  <FieldError message={errors.dob?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-gender">Gender</Label>
                  <select id="ob-gender" className={SELECT_CLS} {...register('gender')}>
                    <option value="">Select…</option>
                    {GENDERS.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                  <FieldError message={errors.gender?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-phone">Phone number 📞</Label>
                  <Input id="ob-phone" type="tel" placeholder="+1 555 000 0000"
                    autoComplete="tel" className="h-10" {...register('phone')} />
                  <FieldError message={errors.phone?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-country">Country 🌍</Label>
                  <select id="ob-country" className={SELECT_CLS} {...register('country')}>
                    <option value="">Select…</option>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <FieldError message={errors.country?.message} />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  ← Back
                </Button>
                <Button type="button" onClick={goNext} className="px-8">
                  Continue →
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Avatar ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative w-32 h-32 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-4 ring-primary/20 shadow-lg group cursor-pointer transition-transform hover:scale-105"
                  aria-label="Upload profile photo"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-bold text-primary-foreground select-none">
                      {initials}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-7 h-7 text-white" />
                    <span className="text-white text-xs font-semibold">Upload</span>
                  </div>
                </button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {avatarPreview ? '✨ Looking great! Click to change.' : '📷 Click the circle to upload a photo'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG or GIF · max 5 MB</p>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {avatarError && (
                  <p className="text-sm text-destructive">⚠️ {avatarError}</p>
                )}
              </div>

              {submitError && (
                <p className="text-sm text-destructive text-center" role="alert">⚠️ {submitError}</p>
              )}

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button type="submit" className="px-8" disabled={isSubmitting}>
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                    : '🚀 Complete Profile'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>

      <p className="mt-6 text-xs text-muted-foreground/60">
        Esperia Studio · Internal use only
      </p>
    </div>
  );
}
