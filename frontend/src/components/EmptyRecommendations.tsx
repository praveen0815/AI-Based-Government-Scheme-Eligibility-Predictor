import { Link } from "react-router-dom";
import { useI18n } from "../context/LanguageContext";
import { EmptyState } from "./ui/EmptyState";
import { Button } from "./ui/Button";

export function EmptyRecommendations({ onEditProfile }: { onEditProfile: () => void }) {
  const { t } = useI18n();

  return (
    <EmptyState title={t.emptyTitle} description={t.emptyDescription}>
      <Button type="button" onClick={onEditProfile}>
        {t.emptyEditProfile}
      </Button>
      <Link
        to="/schemes"
        className="inline-flex rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-900 hover:bg-canvas"
      >
        {t.emptyExplore}
      </Link>
    </EmptyState>
  );
}
