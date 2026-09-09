import { useState } from "react";
import { FormField } from "./FormField";

export function PasswordField({
  id,
  label,
  value,
  error,
  hint,
  autoComplete,
  required,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField id={id} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="field-input pr-28"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[10px] px-3 py-2 text-[16px] font-semibold text-action hover:bg-sage"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </FormField>
  );
}
