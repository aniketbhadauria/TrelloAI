import { Link, useNavigate, useLocation } from 'react-router-dom'
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
  password: z.string().min(1, 'Password is required'),
})
type LoginForm = z.infer<typeof schema>

function formatLoginError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/email logins are disabled/i.test(msg))
    return 'Email/password sign-in is disabled. Enable it in Supabase Dashboard → Authentication → Providers → Email.'
  return msg || 'Could not sign in'
}

export default function LoginPage() {
  usePageTitle('Sign In')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/boards'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: LoginForm) => {
    try {
      await signIn(data.email, data.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError('root', { message: formatLoginError(err) })
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your <span className="font-medium">@esperiastudio.com</span> account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@esperiastudio.com"
            className="h-10"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="h-10"
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {errors.root && (
          <p className="text-sm text-destructive" role="alert">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" className="w-full h-10 mt-2" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
