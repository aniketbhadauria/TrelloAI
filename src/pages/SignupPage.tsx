import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/usePageTitle'

const schema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .refine((v) => v.toLowerCase().endsWith('@esperiastudio.com'), {
      message: 'Only @esperiastudio.com accounts are allowed',
    }),
  password: z.string().min(6, 'At least 6 characters'),
})
type SignupForm = z.infer<typeof schema>

function formatSignupError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/signups not allowed/i.test(msg))
    return 'New sign-ups are disabled. Enable them in Supabase Dashboard → Authentication → User Signups.'
  return msg || 'Could not sign up'
}

export default function SignupPage() {
  usePageTitle('Sign Up')
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [successMsg, setSuccessMsg] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: SignupForm) => {
    try {
      const result = await signUp(data.email, data.password)
      if (result.session) {
        navigate('/boards', { replace: true })
      } else {
        setSuccessMsg('Check your email to confirm your account, then sign in.')
      }
    } catch (err) {
      setError('root', { message: formatSignupError(err) })
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Use your <span className="font-medium">@esperiastudio.com</span> email.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@esperiastudio.com"
            className="h-10"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            className="h-10"
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          <p className="text-xs text-muted-foreground">At least 6 characters.</p>
        </div>

        {errors.root && (
          <p className="text-sm text-destructive" role="alert">
            {errors.root.message}
          </p>
        )}
        {successMsg && (
          <p className="text-sm text-muted-foreground" role="status">
            {successMsg}
          </p>
        )}

        <Button type="submit" className="w-full h-10 mt-2" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
