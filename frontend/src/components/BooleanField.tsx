import { useI18n } from "../context/LanguageContext";
import { yesNoOptions } from "../utils/fieldOptions";
import { SelectField } from "./SelectField";

interface BooleanFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
}

export function BooleanField({ id, label, value, error, hint, onChange }: BooleanFieldProps) {
  const { t } = useI18n();

  return (
    <SelectField
      id={id}
      label={label}
      value={value}
      error={error}
      hint={hint}
      required
      options={yesNoOptions(t)}
      placeholder={t.selectYesNo}
      onChange={onChange}
    />
  );
}
