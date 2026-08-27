import { FormField } from "./FormField";

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
}

export function SelectField({
  id,
  label,
  value,
  error,
  hint,
  required,
  options,
  placeholder,
  onChange,
}: SelectFieldProps) {
  return (
    <FormField id={id} label={label} hint={hint} error={error} required={required}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="field-input"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
