import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CitizenForm } from "../components/CitizenForm";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/ui/PageHeader";
import { ResearchNotice } from "../components/ResearchNotice";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import { ApiError, recommendSchemes } from "../services/api";
import {
  EMPTY_FORM,
  profileToForm,
  validateCitizenForm,
  type CitizenFormValues,
  type FieldErrors,
} from "../utils/validateCitizen";

export function CheckPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const { profile, setSubmission } = useRecommendation();
  const [values, setValues] = useState<CitizenFormValues>(
    profile ? profileToForm(profile) : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof CitizenFormValues>(field: K, value: CitizenFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const { errors: nextErrors, profile: nextProfile } = validateCitizenForm(values, t);
    setErrors(nextErrors);
    setApiError(null);
    if (!nextProfile) return;

    setLoading(true);
    try {
      const result = await recommendSchemes(nextProfile);
      setSubmission(nextProfile, result);
      navigate("/results");
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : t.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader title={t.checkTitle} description={t.checkDescription} />
      {isAuthenticated ? (
        <aside className="card-surface p-5 sm:p-6">
          <p className="text-[17px] leading-relaxed text-ink-500 sm:text-[18px]">
            {t.checkWalletPrompt}{" "}
            <Link to="/wallet" className="font-semibold text-action underline-offset-2 hover:underline">
              {t.checkOpenWallet}
            </Link>
          </p>
        </aside>
      ) : (
        <aside className="card-surface p-5 sm:p-6">
          <p className="text-[17px] leading-relaxed text-ink-500 sm:text-[18px]">
            {t.checkRegisterPromptBefore}{" "}
            <Link to="/register" className="font-semibold text-action underline-offset-2 hover:underline">
              {t.checkRegisterPromptLink}
            </Link>{" "}
            {t.checkRegisterPromptAfter}
          </p>
        </aside>
      )}
      <ResearchNotice compact />
      <CitizenForm
        values={values}
        errors={errors}
        loading={loading}
        submitLabel={t.checkSubmit}
        onChange={update}
        onErrors={setErrors}
        onReset={() => {
          setValues(EMPTY_FORM);
          setErrors({});
          setApiError(null);
        }}
        onSubmit={handleSubmit}
      >
        {loading ? <LoadingState title={t.analyzingTitle} message={t.analyzingText} /> : null}
        {apiError ? <ErrorState message={apiError} /> : null}
      </CitizenForm>
    </div>
  );
}
