import { useI18n } from "../context/LanguageContext";
import { Button } from "./ui/Button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-[16px] border border-red-200 bg-red-50 px-6 py-5" role="alert">
      <p className="text-[17px] font-semibold text-danger">{message}</p>
      {onRetry ? (
        <Button type="button" variant="danger" className="mt-4" onClick={onRetry}>
          {t.tryAgain}
        </Button>
      ) : null}
    </div>
  );
}
