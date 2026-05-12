export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null;
  avatar_url: string | null;
  phone: string | null;
  country: string | null;
  onboarding_completed: boolean;
  updated_at: string;
}
