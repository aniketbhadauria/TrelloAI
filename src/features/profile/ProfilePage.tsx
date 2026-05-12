import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2, ArrowLeft } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Profile } from '@/types/profile';

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

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  dob:       z.string().min(1, 'Required'),
  gender:    z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say'], { message: 'Select a gender' }),
  phone:     z.string().min(1, 'Required'),
  country:   z.string().min(1, 'Required'),
});
type ProfileForm = z.infer<typeof schema>;

const SELECT_CLS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ' +
  'focus:ring-offset-2 disabled:opacity-50';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export default function ProfilePage() {
  usePageTitle('Edit Profile');
  const navigate = useNavigate();
  const { profile, saveProfile, uploadAvatar } = useProfile();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!profile) return;
    reset({
      firstName: profile.first_name ?? '',
      lastName:  profile.last_name ?? '',
      dob:       profile.date_of_birth ?? '',
      gender:    profile.gender ?? undefined,
      phone:     profile.phone ?? '',
      country:   profile.country ?? '',
    });
    if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
  }, [profile, reset]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  const onSubmit = async (data: ProfileForm) => {
    setSubmitError('');
    try {
      let avatarUrl = profile?.avatar_url ?? undefined;
      if (avatarFile) avatarUrl = await uploadAvatar(avatarFile);
      await saveProfile({
        first_name:    data.firstName,
        last_name:     data.lastName,
        display_name:  `${data.firstName} ${data.lastName}`,
        date_of_birth: data.dob,
        gender:        data.gender,
        phone:         data.phone,
        country:       data.country,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
      navigate(-1);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const initials = (profile?.first_name?.[0] ?? profile?.email?.[0] ?? '?').toUpperCase();

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold tracking-tight mb-8">Edit Profile</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-4 ring-primary/20 group cursor-pointer shrink-0"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <div>
            <p className="text-sm font-medium">Profile photo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click to change · JPG, PNG, GIF</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="p-first">First name</Label>
            <Input id="p-first" autoComplete="given-name" {...register('firstName')} />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-last">Last name</Label>
            <Input id="p-last" autoComplete="family-name" {...register('lastName')} />
            <FieldError message={errors.lastName?.message} />
          </div>
        </div>

        {/* DOB + Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="p-dob">Date of birth</Label>
            <Input id="p-dob" type="date" {...register('dob')} />
            <FieldError message={errors.dob?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-gender">Gender</Label>
            <select id="p-gender" className={SELECT_CLS} {...register('gender')}>
              <option value="">Select…</option>
              {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <FieldError message={errors.gender?.message} />
          </div>
        </div>

        {/* Phone + Country */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="p-phone">Phone number</Label>
            <Input id="p-phone" type="tel" autoComplete="tel" {...register('phone')} />
            <FieldError message={errors.phone?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-country">Country</Label>
            <select id="p-country" className={SELECT_CLS} {...register('country')}>
              <option value="">Select…</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <FieldError message={errors.country?.message} />
          </div>
        </div>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting || (!isDirty && !avatarFile)}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
