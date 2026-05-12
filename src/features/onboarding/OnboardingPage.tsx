import { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/Logo';
import type { Profile } from '@/types/profile';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Bahrain', 'Bangladesh', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Czech Republic', 'Denmark', 'Egypt', 'Finland',
  'France', 'Germany', 'Greece', 'Hungary', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan',
  'Kenya', 'Kuwait', 'Lebanon', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands',
  'New Zealand', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia',
  'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden',
  'Switzerland', 'Thailand', 'Tunisia', 'Turkey', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Venezuela', 'Vietnam',
].sort();

const GENDERS: { value: Profile['gender']; label: string }[] = [
  { value: 'male',              label: 'Male' },
  { value: 'female',            label: 'Female' },
  { value: 'non_binary',        label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm ' +
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export default function OnboardingPage() {
  const { user } = useAuth();
  const { isComplete, saveProfile, uploadAvatar } = useProfile();

  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile]     = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [dob,       setDob]       = useState('');
  const [gender,    setGender]    = useState('');
  const [phone,     setPhone]     = useState('');
  const [country,   setCountry]   = useState('');
  const [error,     setError]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isComplete) return <Navigate to="/boards" replace />;

  const initials = (user?.email?.[0] ?? '?').toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!avatarFile) {
      setError('Please upload a profile photo.');
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !dob || !gender || !phone.trim() || !country) {
      setError('All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const avatarUrl = await uploadAvatar(avatarFile);
      await saveProfile({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        display_name: `${firstName.trim()} ${lastName.trim()}`,
        date_of_birth: dob,
        gender: gender as Profile['gender'],
        phone: phone.trim(),
        country,
        avatar_url: avatarUrl,
        onboarding_completed: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Brand anchor */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <LogoMark className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Esperia Trello</span>
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Complete your profile</h1>
          <p className="text-sm text-muted-foreground">
            You're almost in. Fill in your details to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-4 ring-background shadow-md group cursor-pointer"
              aria-label="Upload profile photo"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary-foreground select-none">
                  {initials}
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <p className="text-xs text-muted-foreground">Click to upload photo</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* First + Last name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ob-first">First name</Label>
              <Input
                id="ob-first"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-last">Last name</Label>
              <Input
                id="ob-last"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                autoComplete="family-name"
                required
                className="h-10"
              />
            </div>
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ob-dob">Date of birth</Label>
              <Input
                id="ob-dob"
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-gender">Gender</Label>
              <select
                id="ob-gender"
                value={gender}
                onChange={e => setGender(e.target.value)}
                required
                className={SELECT_CLASS}
              >
                <option value="" disabled>Select…</option>
                {GENDERS.map(g => (
                  <option key={g.value ?? ''} value={g.value ?? ''}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone + Country */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ob-phone">Phone number</Label>
              <Input
                id="ob-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                autoComplete="tel"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-country">Country</Label>
              <select
                id="ob-country"
                value={country}
                onChange={e => setCountry(e.target.value)}
                required
                className={SELECT_CLASS}
              >
                <option value="" disabled>Select…</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <Button type="submit" className="w-full h-11" disabled={submitting}>
            {submitting ? 'Saving profile…' : 'Complete Profile'}
          </Button>
        </form>
      </div>
    </div>
  );
}
