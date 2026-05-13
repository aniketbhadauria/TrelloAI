import { Fragment } from 'react'
import { Check } from 'lucide-react'

export const STEPS = [
  { label: 'Personal details', emoji: '👋', hint: "Let's start with the basics" },
  { label: 'Contact & location', emoji: '📍', hint: 'So your team can reach you' },
  { label: 'Profile photo', emoji: '🖼️', hint: 'Put a face to the name' },
] as const

interface OnboardingStepIndicatorProps {
  current: number
}

export default function OnboardingStepIndicator({ current }: OnboardingStepIndicatorProps) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((step, i) => (
        <Fragment key={step.label}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < current
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : i === current
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg'
                    : 'bg-secondary text-muted-foreground'
              }`}
            >
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-[11px] font-medium whitespace-nowrap ${
                i === current ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-px mx-3 mb-5 transition-all duration-300 ${
                i < current ? 'bg-primary' : 'bg-border'
              }`}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
