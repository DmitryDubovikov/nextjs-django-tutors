'use client';

import type { FieldPath, FieldValues, UseControllerProps } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FormFieldBaseProps<T extends FieldValues, N extends FieldPath<T>>
  extends UseControllerProps<T, N> {
  label?: string;
  helperText?: string;
  className?: string;
}

interface TextFieldProps<T extends FieldValues, N extends FieldPath<T>>
  extends FormFieldBaseProps<T, N> {
  type?: 'text' | 'email' | 'tel' | 'url' | 'password';
  placeholder?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Text input form field with react-hook-form integration
 */
export function TextField<T extends FieldValues, N extends FieldPath<T>>({
  name,
  control,
  rules,
  defaultValue,
  label,
  helperText,
  className,
  type = 'text',
  placeholder,
  leftIcon,
  rightIcon,
}: TextFieldProps<T, N>) {
  const { field, fieldState } = useController({ name, control, rules, defaultValue });

  return (
    <Input
      {...field}
      type={type}
      label={label}
      placeholder={placeholder}
      error={fieldState.error?.message}
      helperText={helperText}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      className={className}
    />
  );
}

interface NumberFieldProps<T extends FieldValues, N extends FieldPath<T>>
  extends FormFieldBaseProps<T, N> {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Number input form field with react-hook-form integration
 */
export function NumberField<T extends FieldValues, N extends FieldPath<T>>({
  name,
  control,
  rules,
  defaultValue,
  label,
  helperText,
  className,
  placeholder,
  min,
  max,
  step,
}: NumberFieldProps<T, N>) {
  const { field, fieldState } = useController({ name, control, rules, defaultValue });

  return (
    <Input
      type="number"
      label={label}
      placeholder={placeholder}
      error={fieldState.error?.message}
      helperText={helperText}
      className={className}
      min={min}
      max={max}
      step={step}
      value={field.value ?? ''}
      onChange={(e) => {
        const value = e.target.value === '' ? undefined : Number(e.target.value);
        field.onChange(value);
      }}
      onBlur={field.onBlur}
      ref={field.ref}
      name={field.name}
    />
  );
}

interface TextareaFieldProps<T extends FieldValues, N extends FieldPath<T>>
  extends FormFieldBaseProps<T, N> {
  placeholder?: string;
  rows?: number;
}

/**
 * Textarea form field with react-hook-form integration
 */
export function TextareaField<T extends FieldValues, N extends FieldPath<T>>({
  name,
  control,
  rules,
  defaultValue,
  label,
  helperText,
  className,
  placeholder,
  rows = 4,
}: TextareaFieldProps<T, N>) {
  const { field, fieldState } = useController({ name, control, rules, defaultValue });

  return (
    <Textarea
      {...field}
      label={label}
      placeholder={placeholder}
      error={fieldState.error?.message}
      helperText={helperText}
      className={className}
      rows={rows}
    />
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps<T extends FieldValues, N extends FieldPath<T>>
  extends FormFieldBaseProps<T, N> {
  placeholder?: string;
  options: SelectOption[];
}

/**
 * Select form field with react-hook-form integration
 */
export function SelectField<T extends FieldValues, N extends FieldPath<T>>({
  name,
  control,
  rules,
  defaultValue,
  label,
  helperText,
  className,
  placeholder,
  options,
}: SelectFieldProps<T, N>) {
  const { field, fieldState } = useController({ name, control, rules, defaultValue });
  const hasError = Boolean(fieldState.error);

  const selectId = `select-${name}`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className={cn('font-medium text-sm', hasError ? 'text-error' : 'text-foreground')}
        >
          {label}
        </label>
      )}
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger
          id={selectId}
          ref={field.ref}
          className={cn(hasError && 'border-error focus-visible:ring-error/30')}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasError && (
        <p className="text-error text-sm" role="alert">
          {fieldState.error?.message}
        </p>
      )}
      {!hasError && helperText && <p className="text-muted-foreground text-sm">{helperText}</p>}
    </div>
  );
}

interface CheckboxFieldProps<T extends FieldValues, N extends FieldPath<T>>
  extends FormFieldBaseProps<T, N> {
  description?: string;
}

/**
 * Checkbox form field with react-hook-form integration
 */
export function CheckboxField<T extends FieldValues, N extends FieldPath<T>>({
  name,
  control,
  rules,
  defaultValue,
  label,
  description,
  className,
}: CheckboxFieldProps<T, N>) {
  const { field, fieldState } = useController({ name, control, rules, defaultValue });
  const hasError = Boolean(fieldState.error);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={field.value ?? false}
          onChange={(e) => field.onChange(e.target.checked)}
          onBlur={field.onBlur}
          ref={field.ref}
          name={field.name}
          className={cn(
            'h-5 w-5 rounded border-border text-primary-500',
            'focus:ring-2 focus:ring-primary-300 focus:ring-offset-2',
            hasError && 'border-error'
          )}
        />
        <span className="font-medium text-sm">{label}</span>
      </label>
      {description && <p className="ml-8 text-muted-foreground text-sm">{description}</p>}
      {hasError && (
        <p className="ml-8 text-error text-sm" role="alert">
          {fieldState.error?.message}
        </p>
      )}
    </div>
  );
}
