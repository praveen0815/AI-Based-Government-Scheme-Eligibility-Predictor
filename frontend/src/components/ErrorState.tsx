import { useI18n } from "../context/LanguageContext";
import { Button } from "./ui/Button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-4" role="alert">
      <p className="text-[16px] font-semibold text-danger sm:text-[17px]">{message}</p>
      {onRetry ? (
        <Button type="button" variant="danger" className="mt-3" onClick={onRetry}>
          {t.tryAgain}
        </Button>
      ) : null}
    </div>
  );
}
