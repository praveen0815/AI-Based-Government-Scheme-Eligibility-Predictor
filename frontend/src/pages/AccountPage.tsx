import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { LoadingState } from "../components/LoadingState";
import { PasswordField } from "../components/PasswordField";
import { ProfileCompletenessCard } from "../components/ProfileCompletenessCard";
import { ResearchNotice } from "../components/ResearchNotice";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRecommendation } from "../context/RecommendationContext";
import {
  ApiError,
  changeAccountPassword,
  deleteAccount,
  fetchCurrentUser,
  fetchProfileCompleteness,
  updateAccountProfile,
} from "../services/api";
import type { AuthUser, ProfileCompleteness } from "../types/api";
import { markAccountDeleted } from "../utils/authStorage";
import { formatCheckedAt } from "../utils/displayLabels";

function isProfileCompleteness(value: unknown): value is ProfileCompleteness {
  if (!value || typeof value !== "object") return false;
  const record = value as ProfileCompleteness;
  return (
    typeof record.percentage === "number" &&
    typeof record.completed_fields === "number" &&
    typeof record.total_fields === "number" &&
    Array.isArray(record.incomplete_fields)
  );
}

function loginMethodLabel(account: AuthUser, t: ReturnType<typeof useI18n>["t"]): string {
  if (account.has_google && !account.has_password) {
    return t.accountSignedInGoogle;
  }
  if (account.has_password && account.has_google) {
    return t.accountPasswordAccount;
  }
  return t.accountPasswordAccount;
}

export function AccountPage() {
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const { user, updateUser, logout } = useAuth();
  const { clearResult } = useRecommendation();
  const [account, setAccount] = useState<AuthUser | null>(user);
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nameNotice, setNameNotice] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAccount() {
      setLoading(true);
      setLoadError(null);
      try {
        const next = await fetchCurrentUser();
        if (cancelled) return;
        setAccount(next);
        setFullName(next.full_name);
        updateUser(next);
        try {
          const nextCompleteness = await fetchProfileCompleteness();
          if (!cancelled) {
            setCompleteness(isProfileCompleteness(nextCompleteness) ? nextCompleteness : null);
          }
        } catch {
          if (!cancelled) setCompleteness(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setLoadError(caught instanceof ApiError ? caught.message : t.networkError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadAccount();
    return () => {
      cancelled = true;
    };
    // Load the authenticated account once; language only changes labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const canChangePassword = Boolean(account?.has_password);

  async function handleSaveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = fullName.trim();
    if (!nextName) {
      setNameError(t.fullNameRequired);
      return;
    }
    setSavingName(true);
    setNameError(null);
    setNameNotice(null);
    try {
      const updated = await updateAccountProfile(nextName);
      setAccount(updated);
      setFullName(updated.full_name);
      updateUser(updated);
      setNameNotice(t.accountNameUpdated);
    } catch (caught) {
      setNameError(caught instanceof ApiError ? caught.message : t.accountNameFailed);
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canChangePassword) return;
    if (newPassword.length < 8) {
      setPasswordError(t.passwordLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordMismatch);
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordNotice(null);
    try {
      await changeAccountPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(t.accountPasswordUpdated);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        setPasswordError(t.currentPasswordIncorrect);
      } else {
        setPasswordError(caught instanceof ApiError ? caught.message : t.accountPasswordFailed);
      }
    } finally {
      setSavingPassword(false);
    }
  }

  function handleLogout() {
    logout();
    clearResult();
    navigate("/");
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      markAccountDeleted();
      clearResult();
      // Leave /settings before clearing the JWT so ProtectedRoute cannot
      // replace this navigation with /login.
      navigate({ pathname: "/", search: "accountDeleted=1" }, { replace: true });
      logout();
    } catch (caught) {
      setDeleteError(caught instanceof ApiError ? caught.message : t.genericError);
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title={t.accountTitle} description={t.accountLead} />
      <ResearchNotice compact />

      {loading ? <LoadingState message={t.accountLoading} /> : null}
      {loadError ? <ErrorState message={loadError} /> : null}

      {!loading && account ? (
        <>
          <section className="card-surface space-y-6 p-6 md:p-8" aria-labelledby="account-profile">
            <h2 id="account-profile" className="section-title">
              {t.accountProfile}
            </h2>
            <form onSubmit={(event) => void handleSaveName(event)} className="space-y-5">
              <FormField id="account-name" label={t.fullName} required>
                <input
                  id="account-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="field-input"
                  autoComplete="name"
                />
              </FormField>
              <div>
                <p className="field-label">{t.accountEmail}</p>
                <p className="mt-2 text-[17px] text-ink-900">{account.email}</p>
                <p className="mt-1 text-[15px] text-ink-500">{t.accountEmailHint}</p>
              </div>
              <div>
                <p className="field-label">{t.accountType}</p>
                <p className="mt-2 text-[17px] text-ink-900">{loginMethodLabel(account, t)}</p>
              </div>
              <div>
                <p className="field-label">{t.accountCreatedOn}</p>
                <p className="mt-2 text-[17px] text-ink-500">
                  {account.created_at ? formatCheckedAt(account.created_at, language) : t.accountCreatedUnknown}
                </p>
              </div>
              {nameNotice ? (
                <p className="notice-success" role="status">
                  {nameNotice}
                </p>
              ) : null}
              {nameError ? <ErrorState message={nameError} /> : null}
              <Button type="submit" disabled={savingName}>
                {t.accountSaveName}
              </Button>
            </form>
          </section>

          <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="account-login-method">
            <h2 id="account-login-method" className="section-title">
              {t.accountLoginMethod}
            </h2>
            <div className="flex flex-wrap gap-2">
              {account.has_google ? <Badge>{t.accountSignedInGoogle}</Badge> : null}
              {account.has_password ? <Badge tone="muted">{t.accountPasswordAccount}</Badge> : null}
              {!account.has_google && !account.has_password ? (
                <Badge tone="muted">{loginMethodLabel(account, t)}</Badge>
              ) : null}
            </div>
            {account.has_google && account.has_password ? (
              <p className="text-[16px] text-ink-500">{t.accountLinkedGoogle}</p>
            ) : null}
          </section>

          <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="account-wallet">
            <h2 id="account-wallet" className="section-title">
              {t.accountWalletTitle}
            </h2>
            <p className="text-[17px] leading-relaxed text-ink-500">{t.accountWalletLead}</p>
            {!completeness ? <p className="text-[17px] text-ink-500">{t.accountNoWallet}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Link
                to="/wallet"
                className="btn-text inline-flex items-center justify-center rounded-[12px] bg-action px-5 py-3 text-white shadow-sm transition duration-150 hover:bg-action-hover"
              >
                {t.goToWallet}
              </Link>
              <Link
                to="/wallet"
                className="btn-text inline-flex items-center justify-center rounded-[12px] border border-line bg-surface px-5 py-3 text-ink-900 transition duration-150 hover:border-slate-300 hover:bg-canvas"
              >
                {t.accountEditProfile}
              </Link>
            </div>
          </section>

          {completeness ? (
            <ProfileCompletenessCard completeness={completeness} onCompleteProfile={() => navigate("/wallet")} />
          ) : null}

          {canChangePassword ? (
            <section className="card-surface space-y-5 p-6 md:p-8" aria-labelledby="account-security">
              <h2 id="account-security" className="section-title">
                {t.accountSecurity}
              </h2>
              <form onSubmit={(event) => void handleChangePassword(event)} className="space-y-5">
                <PasswordField
                  id="account-current-password"
                  label={t.accountCurrentPassword}
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
                <PasswordField
                  id="account-new-password"
                  label={t.accountNewPassword}
                  hint={t.passwordHint}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <PasswordField
                  id="account-confirm-password"
                  label={t.accountConfirmNewPassword}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
                {passwordNotice ? (
                  <p className="notice-success" role="status">
                    {passwordNotice}
                  </p>
                ) : null}
                {passwordError ? <ErrorState message={passwordError} /> : null}
                <Button type="submit" disabled={savingPassword}>
                  {t.accountChangePassword}
                </Button>
              </form>
            </section>
          ) : (
            <section className="card-surface space-y-3 p-6 md:p-8" aria-labelledby="account-security">
              <h2 id="account-security" className="section-title">
                {t.accountSecurity}
              </h2>
              <p className="text-[17px] leading-relaxed text-ink-500">{t.accountSignedInGoogle}</p>
              <p className="text-[16px] leading-relaxed text-ink-500">{t.accountGooglePasswordNote}</p>
            </section>
          )}

          <section className="card-surface space-y-4 p-6 md:p-8" aria-labelledby="account-session">
            <h2 id="account-session" className="section-title">
              {t.accountSession}
            </h2>
            <Button type="button" variant="secondary" onClick={handleLogout}>
              {t.navLogout}
            </Button>
          </section>

          <section className="card-surface space-y-4 border-red-200 p-6 md:p-8" aria-labelledby="account-danger">
            <h2 id="account-danger" className="section-title text-danger">
              {t.accountDanger}
            </h2>
            <p className="text-[17px] leading-relaxed text-ink-500">{t.accountDeleteLead}</p>
            {deleteError ? <ErrorState message={deleteError} /> : null}
            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={deleting}>
              {t.accountDeleteTitle}
            </Button>
            {confirmDelete ? (
              <div className="rounded-[12px] border border-red-200 bg-red-50 p-4" role="alertdialog" aria-labelledby="account-delete-confirm">
                <p id="account-delete-confirm" className="font-semibold text-danger">
                  {t.accountDeleteConfirm}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" variant="danger" onClick={() => void handleDelete()} disabled={deleting}>
                    {t.accountDeleteYes}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    {t.cancel}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
