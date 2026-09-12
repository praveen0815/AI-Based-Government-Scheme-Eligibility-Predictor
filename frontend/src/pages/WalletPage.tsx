import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CitizenForm } from "../components/CitizenForm";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ProfileCompletenessCard } from "../components/ProfileCompletenessCard";
import { ResearchNotice } from "../components/ResearchNotice";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import {
  ApiError,
  createWallet,
  deleteWallet,
  fetchProfileCompleteness,
  getMyWallet,
  recommendFromWallet,
  updateWallet,
  walletToProfile,
} from "../services/api";
import type { CitizenWallet, ProfileCompleteness } from "../types/api";
import { walletSummaryGroups } from "../utils/displayLabels";
import {
  EMPTY_FORM,
  profileToForm,
  validateCitizenForm,
  type CitizenFormValues,
  type FieldErrors,
} from "../utils/validateCitizen";

type WalletMode = "empty" | "create" | "view" | "edit";

export function WalletPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { setSubmission } = useRecommendation();
  const [mode, setMode] = useState<WalletMode>("empty");
  const [wallet, setWallet] = useState<CitizenWallet | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);
  const [values, setValues] = useState<CitizenFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function loadCompleteness() {
    try {
      setCompleteness(await fetchProfileCompleteness());
    } catch {
      setCompleteness(null);
    }
  }

  function update<K extends keyof CitizenFormValues>(field: K, value: CitizenFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function showWallet(next: CitizenWallet, message: string | null = null) {
    setWallet(next);
    setValues(profileToForm(walletToProfile(next)));
    setMode("view");
    setNotice(message);
    setConfirmDelete(false);
    void loadCompleteness();
  }

  useEffect(() => {
    let cancelled = false;
    async function loadMine() {
      setLoading(true);
      setApiError(null);
      try {
        const existing = await getMyWallet();
        if (!cancelled) showWallet(existing);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setWallet(null);
          setCompleteness(null);
          setMode("empty");
        } else {
          setApiError(error instanceof ApiError ? error.message : t.networkError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadMine();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const { errors: nextErrors, profile } = validateCitizenForm(values, t);
    setErrors(nextErrors);
    setApiError(null);
    if (!profile) return;
    setLoading(true);
    try {
      const created = await createWallet(profile);
      showWallet(created, t.walletCreated);
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : t.createWalletError);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !wallet) return;
    const { errors: nextErrors, profile } = validateCitizenForm(values, t);
    setErrors(nextErrors);
    setApiError(null);
    if (!profile) return;
    setLoading(true);
    try {
      const updated = await updateWallet(wallet.citizen_id, profile);
      showWallet(updated, t.walletUpdated);
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : t.updateWalletError);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecommend() {
    if (!wallet || loading) return;
    setLoading(true);
    setApiError(null);
    try {
      const result = await recommendFromWallet(wallet.citizen_id);
      setSubmission(walletToProfile(wallet), result);
      navigate("/results");
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : t.recommendWalletError);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!wallet || loading) return;
    setLoading(true);
    setApiError(null);
    try {
      await deleteWallet(wallet.citizen_id);
      setWallet(null);
      setCompleteness(null);
      setValues(EMPTY_FORM);
      setMode("empty");
      setNotice(null);
      setConfirmDelete(false);
      navigate("/dashboard");
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : t.deleteWalletError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl page-stack">
      <PageHeader title={t.walletTitle} description={t.walletDescription} />
      <ResearchNotice compact />
      <p className="text-[15px] text-ink-500">{t.walletNotIdentity}</p>

      {notice ? (
        <p className="notice-success" role="status">
          {notice}
        </p>
      ) : null}
      {loading && mode !== "create" && mode !== "edit" ? (
        <LoadingState message={t.workingWallet} />
      ) : null}
      {apiError ? <ErrorState message={apiError} /> : null}

      {mode === "empty" && !loading ? (
        <EmptyState title={t.createProfileTitle} description={t.createProfileDescription}>
          <Button
            type="button"
            onClick={() => {
              setMode("create");
              setNotice(null);
            }}
          >
            {t.createProfile}
          </Button>
        </EmptyState>
      ) : null}

      {mode === "view" && wallet ? (
        <section className="space-y-6">
          {completeness ? (
            <ProfileCompletenessCard
              completeness={completeness}
              onCompleteProfile={() => {
                setMode("edit");
                setValues(profileToForm(walletToProfile(wallet)));
                setNotice(null);
              }}
            />
          ) : null}
          <p className="text-[15px] text-ink-500">
            {t.walletIdLabel} <span className="break-all">{wallet.citizen_id}</span>. {t.walletIdNote}
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {walletSummaryGroups(walletToProfile(wallet), t).map((group) => (
              <article key={group.title} className="card-surface p-6">
                <h2 className="card-title">{group.title}</h2>
                <dl className="mt-5 space-y-4">
                  {group.rows.map((row) => (
                    <div key={row.label} className="border-b border-line pb-3 last:border-0 last:pb-0">
                      <dt className="text-[15px] font-semibold uppercase tracking-wide text-ink-500">{row.label}</dt>
                      <dd className="mt-1 text-[17px] font-medium text-ink-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMode("edit");
                setValues(profileToForm(walletToProfile(wallet)));
                setNotice(null);
              }}
            >
              {t.editProfile}
            </Button>
            <Button type="button" onClick={() => void handleRecommend()} disabled={loading}>
              {t.findEligibleSchemes}
            </Button>
            <Link
              to="/history"
              className="btn-text inline-flex items-center justify-center rounded-[12px] border border-line bg-surface px-5 py-3 text-ink-900 hover:bg-sage"
            >
              {t.navHistory}
            </Link>
            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
              {t.deleteWallet}
            </Button>
          </div>
          {confirmDelete ? (
            <div className="rounded-[12px] border border-red-200 bg-red-50 p-5" role="alertdialog" aria-labelledby="delete-title">
              <p id="delete-title" className="font-semibold text-danger">
                {t.deleteWalletConfirm}
              </p>
              <div className="mt-4 flex gap-3">
                <Button type="button" variant="danger" onClick={() => void handleDelete()}>
                  {t.deleteWalletYes}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
                  {t.cancel}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {mode === "create" ? (
        <CitizenForm
          values={values}
          errors={errors}
          loading={loading}
          submitLabel={t.saveWallet}
          onChange={update}
          onErrors={setErrors}
          onReset={() => {
            setValues(EMPTY_FORM);
            setErrors({});
            setApiError(null);
          }}
          onSubmit={handleCreate}
        >
          {loading ? <LoadingState message={t.savingWallet} /> : null}
        </CitizenForm>
      ) : null}

      {mode === "edit" && wallet ? (
        <CitizenForm
          values={values}
          errors={errors}
          loading={loading}
          submitLabel={t.saveWallet}
          onChange={update}
          onErrors={setErrors}
          onReset={() => {
            if (wallet) setValues(profileToForm(walletToProfile(wallet)));
            setErrors({});
            setApiError(null);
          }}
          onSubmit={handleUpdate}
        >
          {loading ? <LoadingState message={t.updatingWallet} /> : null}
        </CitizenForm>
      ) : null}
    </div>
  );
}
