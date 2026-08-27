import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { LoadingState } from "../components/LoadingState";
import { PasswordField } from "../components/PasswordField";
import { ResearchNotice } from "../components/ResearchNotice";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { ApiError, loginWithGoogle, registerAccount } from "../services/api";

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!fullName.trim()) nextErrors.fullName = t.fullNameRequired;
    if (!email.trim() || !email.includes("@")) nextErrors.email = t.emailInvalid;
    if (password.length < 8) nextErrors.password = t.passwordLength;
    if (password !== confirmPassword) nextErrors.confirmPassword = t.passwordMismatch;
    setFieldErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length > 0) return;
    if (googleLoading) return;
    setLoading(true);
    try {
      await registerAccount({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });
      navigate("/login?registered=1", { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError(t.emailRegistered);
      } else {
        setError(caught instanceof ApiError ? caught.message : t.registerFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    if (loading || googleLoading) return;
    setError(null);
    setFieldErrors({});
    if (!credential) {
      setError(t.googleSignInFailed);
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle(credential);
      login(result.access_token, result.user);
      navigate("/dashboard", { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError(t.emailRegistered);
      } else {
        setError(t.googleSignInFailed);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card-surface space-y-7 p-7 sm:p-9">
        <BrandMark />
        <header className="space-y-3">
          <h1 className="text-[34px] font-extrabold tracking-tight text-ink-900 sm:text-[38px]">{t.registerTitle}</h1>
          <p className="text-[17px] leading-relaxed text-ink-500">{t.registerLead}</p>
        </header>
        <ResearchNotice compact />
        {error ? <ErrorState message={error} /> : null}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <FormField id="register-name" label={t.fullName} error={fieldErrors.fullName} required>
            <input
              id="register-name"
              required
              aria-invalid={Boolean(fieldErrors.fullName)}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="field-input"
            />
          </FormField>
          <FormField id="register-email" label={t.email} error={fieldErrors.email} required>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field-input"
            />
          </FormField>
          <PasswordField
            id="register-password"
            label={t.password}
            hint={t.passwordHint}
            autoComplete="new-password"
            required
            value={password}
            error={fieldErrors.password}
            onChange={setPassword}
          />
          <PasswordField
            id="register-confirm"
            label={t.confirmPassword}
            autoComplete="new-password"
            required
            value={confirmPassword}
            error={fieldErrors.confirmPassword}
            onChange={setConfirmPassword}
          />
          {loading ? <LoadingState message={t.creatingAccount} /> : null}
          {googleLoading ? <LoadingState message={t.signingInGoogle} /> : null}
          <Button type="submit" disabled={loading || googleLoading} className="w-full">
            {t.createAccount}
          </Button>
          <GoogleSignInButton onCredential={(value) => void handleGoogleCredential(value)} disabled={loading || googleLoading} />
          <p className="text-[16px] text-ink-500">
            {t.alreadyHaveAccount}{" "}
            <Link to="/login" className="font-semibold text-action">
              {t.signIn}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
