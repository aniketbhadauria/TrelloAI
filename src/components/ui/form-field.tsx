import React from 'react'
import type { FieldError } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

interface FormFieldProps {
  name?: string
  label?: string
  error?: FieldError
  description?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  labelClassName?: string
}

export function FormField({
  name,
  label,
  error,
  description,
  required,
  children,
  className,
  labelClassName,
}: FormFieldProps) {
  const control = name
    ? React.Children.map(children, (child, i) =>
        i === 0 && React.isValidElement(child)
          ? React.cloneElement(child, { id: name } as object)
          : child
      )
    : children

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className={labelClassName}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      {control}
      {error?.message ? (
        <p className="text-xs text-destructive" role="alert">
          {error.message}
        </p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
