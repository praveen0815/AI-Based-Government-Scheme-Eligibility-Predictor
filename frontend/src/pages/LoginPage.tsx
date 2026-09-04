import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
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
import { ApiError, loginAccount, loginWithGoogle } from "../services/api";
import { peekAccountDeleted } from "../utils/authStorage";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const registered = searchParams.get("registered") === "1";

  if (peekAccountDeleted()) {
    return <Navigate to="/?accountDeleted=1" replace />;
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = t.emailRequired;
    if (!password) nextErrors.password = t.passwordRequired;
    setFieldErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length > 0) return;
    if (googleLoading) return;
    setLoading(true);
    try {
      const result = await loginAccount(email.trim(), password);
      login(result.access_token, result.user);
      navigate("/dashboard", { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setError(t.invalidCredentials);
      } else {
        setError(caught instanceof ApiError ? caught.message : t.loginFailed);
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
    <div className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-lift">
        <div className="bg-navy-900 px-7 py-6 sm:px-9">
          <BrandMark inverted />
        </div>
        <div className="space-y-7 p-7 sm:p-9">
          <header className="space-y-3">
            <h1 className="page-title">{t.loginTitle}</h1>
            <p className="text-[17px] leading-relaxed text-ink-500 sm:text-[18px]">{t.loginLead}</p>
          </header>
          <ResearchNotice compact />
          {registered ? (
            <p className="notice-success" role="status">
              {t.accountCreated}
            </p>
          ) : null}
          {error ? <ErrorState message={error} /> : null}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormField id="login-email" label={t.email} error={fieldErrors.email} required>
              <input
                id="login-email"
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
              id="login-password"
              label={t.password}
              autoComplete="current-password"
              required
              value={password}
              error={fieldErrors.password}
              onChange={setPassword}
            />
            {loading ? <LoadingState message={t.signingIn} /> : null}
            {googleLoading ? <LoadingState message={t.signingInGoogle} /> : null}
            <Button type="submit" disabled={loading || googleLoading} className="w-full">
              {t.loginSubmit}
            </Button>
            <GoogleSignInButton onCredential={(value) => void handleGoogleCredential(value)} disabled={loading || googleLoading} />
            <p className="text-[16px] text-ink-500">
              {t.needAccount}{" "}
              <Link to="/register" className="font-semibold text-action">
                {t.createAnAccount}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
