import { useForm, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import type { Sprint } from '@/types/board'
import {
  SPRINT_PREFIX,
  type Duration,
  type SprintFormValues,
  buildSchema,
  shiftDate,
} from '@/utils/sprint'

const LABEL_CLS = 'text-xs text-muted-foreground'

interface SprintFormProps {
  defaultValues: SprintFormValues
  minNumber: number
  otherSprints: Sprint[]
  onSubmit: (values: SprintFormValues) => void
  onCancel: () => void
  submitLabel: string
}

interface SprintNumberInputProps {
  id?: string
  register: UseFormRegister<SprintFormValues>
  minNumber: number
  hasError: boolean
}

function SprintNumberInput({ id, register, minNumber, hasError }: SprintNumberInputProps) {
  return (
    <div
      className={`flex items-center gap-2 bg-background border rounded-lg px-3 py-2 transition-colors ${hasError ? 'border-destructive' : 'border-border/50 focus-within:border-primary/50'}`}
    >
      <span className="text-sm text-muted-foreground font-medium select-none">{SPRINT_PREFIX}</span>
      <span className="text-muted-foreground/40 text-sm">#</span>
      <input
        id={id}
        type="number"
        min={minNumber}
        step={1}
        autoFocus
        className="w-16 text-sm font-semibold bg-transparent outline-none"
        {...register('sprintNumber', { valueAsNumber: true })}
      />
    </div>
  )
}

export default function SprintForm({
  defaultValues,
  minNumber,
  otherSprints,
  onSubmit,
  onCancel,
  submitLabel,
}: SprintFormProps) {
  const schema = buildSchema(minNumber, otherSprints)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<SprintFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  })

  const duration = watch('duration')
  const startDate = watch('startDate')

  const handleDurationChange = (d: Duration) => {
    setValue('duration', d, { shouldValidate: true })
    if (d !== 'custom' && startDate) {
      setValue('endDate', shiftDate(startDate, d === '1week' ? 7 : 14), { shouldValidate: true })
    }
  }

  const handleStartChange = (val: string) => {
    setValue('startDate', val, { shouldValidate: true })
    if (duration !== 'custom' && val) {
      setValue('endDate', shiftDate(val, duration === '1week' ? 7 : 14), { shouldValidate: true })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border border-border/50 rounded-xl p-4 bg-secondary/10 space-y-3"
    >
      <FormField
        name="sprintNumber"
        label="Sprint number"
        error={errors.sprintNumber}
        labelClassName={LABEL_CLS}
      >
        <SprintNumberInput
          register={register}
          minNumber={minNumber}
          hasError={!!errors.sprintNumber}
        />
      </FormField>

      <input
        placeholder="Sprint goal (optional)"
        className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 outline-none focus:border-primary/50 transition-colors"
        {...register('goal')}
      />

      <FormField label="Duration" labelClassName={LABEL_CLS}>
        <div className="flex gap-2">
          {(['1week', '2weeks', 'custom'] as Duration[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDurationChange(d)}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                duration === d
                  ? 'bg-primary/15 border-primary/40 text-primary font-medium'
                  : 'bg-background border-border/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {d === '1week' ? '1 week' : d === '2weeks' ? '2 weeks' : 'Custom'}
            </button>
          ))}
        </div>
      </FormField>

      <div className="flex gap-2">
        <FormField
          name="startDate"
          label="Start date"
          error={errors.startDate}
          className="flex-1"
          labelClassName={LABEL_CLS}
        >
          <input
            type="date"
            className={`w-full text-sm bg-background border rounded-lg px-3 py-2 outline-none transition-colors ${errors.startDate ? 'border-destructive' : 'border-border/50 focus:border-primary/50'}`}
            {...register('startDate')}
            onChange={(e) => handleStartChange(e.target.value)}
          />
        </FormField>
        <FormField
          name="endDate"
          label={duration !== 'custom' ? 'End date (auto)' : 'End date'}
          error={errors.endDate}
          className="flex-1"
          labelClassName={LABEL_CLS}
        >
          <input
            type="date"
            readOnly={duration !== 'custom'}
            className={`w-full text-sm bg-background border rounded-lg px-3 py-2 outline-none transition-colors ${
              errors.endDate
                ? 'border-destructive'
                : duration !== 'custom'
                  ? 'border-border/30 text-muted-foreground cursor-default'
                  : 'border-border/50 focus:border-primary/50'
            }`}
            {...register('endDate')}
          />
        </FormField>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="h-8 text-xs">
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!isValid} className="h-8 text-xs">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
