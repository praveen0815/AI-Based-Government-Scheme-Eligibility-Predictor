import { useNavigate } from "react-router-dom";
import { useI18n } from "../../context/LanguageContext";
import type { VoiceAssistantController } from "../../hooks/useVoiceAssistant";
import { formatExtractedFields, formatUnsupportedMentions } from "../../services/voiceAssistantService";
import { formatAdminConfirm, formatReviewConfirm } from "../../services/voiceAdminService";
import { Button } from "../ui/Button";

/** Confirmation and follow-up controls shared by the Voice Assistant page and the floating widget. */
export function AssistantActions({ assistant, compact = false }: { assistant: VoiceAssistantController; compact?: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    adminRecordHref,
    failedRequest,
    handleCancelAdminLookup,
    handleCancelUpdate,
    handleConfirmAdminLookup,
    handleConfirmUpdate,
    handleRequest,
    incomeWhatIf,
    pendingAdmin,
    pendingReview,
    pendingUpdate,
    speech,
    uiState,
  } = assistant;
  const processing = uiState === "processing";
  const boxClass = compact
    ? "assistant-confirm rounded-[14px] border border-line bg-sage p-4 text-left"
    : "rounded-[16px] border border-line bg-sage p-5 text-left";
  const textClass = compact ? "text-[15px] text-ink-700" : "text-[17px] text-ink-700";
  const rowClass = compact ? "mt-3 flex flex-wrap gap-2" : "mt-5 flex flex-wrap gap-3";

  return (
    <>
      {incomeWhatIf?.action === "open_simulator" ? (
        <Button
          type="button"
          onClick={() => navigate("/eligibility-simulator")}
          disabled={speech.speaking || uiState === "speaking" || processing}
        >
          {t.voiceOpenSimulator}
        </Button>
      ) : null}
      {pendingReview ? (
        <div className={boxClass}>
          <p className={textClass}>
            {pendingReview.stage === "choose-user"
              ? t.voiceAdminWhichUser
              : pendingReview.stage === "choose-document"
                ? t.voiceAdminWhichDocument
                : formatReviewConfirm(
                    pendingReview.user?.full_name ?? pendingReview.personQuery,
                    pendingReview.reviewStatus,
                    pendingReview.document?.category ?? pendingReview.category,
                    t,
                    pendingReview.stage === "confirm2",
                  )}
          </p>
          {pendingReview.stage === "confirm1" || pendingReview.stage === "confirm2" ? (
            <div className={rowClass}>
              <Button type="button" onClick={() => void handleConfirmAdminLookup()} disabled={processing}>
                {t.voiceConfirm}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancelAdminLookup} disabled={processing}>
                {t.voiceCancel}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {pendingAdmin ? (
        <div className={boxClass}>
          <p className={textClass}>
            {pendingAdmin.stage === "choose"
              ? t.voiceAdminWhichUser
              : formatAdminConfirm(pendingAdmin.kind, pendingAdmin.query, t)}
          </p>
          {pendingAdmin.stage === "confirm" ? (
            <div className={rowClass}>
              <Button type="button" onClick={() => void handleConfirmAdminLookup()} disabled={processing}>
                {t.voiceConfirm}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancelAdminLookup} disabled={processing}>
                {t.voiceCancel}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {adminRecordHref ? (
        <Button type="button" variant="secondary" onClick={() => navigate(adminRecordHref)}>
          {t.voiceAdminOpenRecord}
        </Button>
      ) : null}
      {pendingUpdate ? (
        <div className={boxClass}>
          <p className={compact ? "text-[15px] font-semibold text-ink-900" : "text-[16px] font-semibold text-ink-900"}>
            {t.voiceUnderstood}
          </p>
          <ul className={`mt-3 space-y-2 ${textClass}`}>
            {formatExtractedFields(pendingUpdate.extracted, t).map((row) => (
              <li key={row.label}>
                {row.label}: {row.value}
              </li>
            ))}
          </ul>
          {pendingUpdate.unsupportedMentions?.length ? (
            <p className="mt-3 text-[15px] text-ink-500">
              {t.voiceUnsupportedFields} ({formatUnsupportedMentions(pendingUpdate.unsupportedMentions, t)})
            </p>
          ) : null}
          <p className={`mt-4 ${textClass}`}>{t.voiceConfirmWallet}</p>
          <div className={rowClass}>
            <Button type="button" onClick={() => void handleConfirmUpdate()} disabled={processing}>
              {t.voiceConfirm}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancelUpdate} disabled={processing}>
              {t.voiceCancel}
            </Button>
          </div>
        </div>
      ) : null}
      {failedRequest ? (
        <Button type="button" variant="secondary" onClick={() => void handleRequest(failedRequest)}>
          {t.voiceRetry}
        </Button>
      ) : null}
    </>
  );
}
