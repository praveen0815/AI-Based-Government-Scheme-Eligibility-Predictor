import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AuthSplitLayout, EyeGlyph, LockGlyph, MailGlyph } from "../components/AuthSplitLayout";
import { ErrorState } from "../components/ErrorState";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { ApiError, loginAccount, loginWithGoogle } from "../services/api";
import { consumeAccountDeleted } from "../utils/authStorage";
import { signedInHomePath } from "../utils/homePath";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();
  const { language, t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const [accountDeleted] = useState(
    () => searchParams.get("accountDeleted") === "1" || consumeAccountDeleted(),
  );

  if (isAuthenticated) {
    return <Navigate to={signedInHomePath(user)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = t.emailRequired;
    if (!password) nextErrors.password = t.passwordRequired;
    setFieldErrors(nextErrors);
    setError(null);
    setNotice(null);
    if (Object.keys(nextErrors).length > 0) return;
    if (googleLoading) return;
    setLoading(true);
    try {
      const result = await loginAccount(email.trim(), password);
      login(result.access_token, result.user);
      navigate(signedInHomePath(result.user), { replace: true });
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
    setNotice(null);
    setFieldErrors({});
    if (!credential) {
      setError(t.googleSignInFailed);
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle(credential);
      login(result.access_token, result.user);
      navigate(signedInHomePath(result.user), { replace: true });
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
    <AuthSplitLayout cardLabel={t.loginTitle}>
      <header className="login-heading">
        <h1>
          {t.loginTitle}
          {language === "en" ? <span aria-hidden="true">!</span> : null}
        </h1>
        <p>{t.loginLead}</p>
      </header>

      {registered ? (
        <p className="notice-success" role="status">
          {t.accountCreated}
        </p>
      ) : null}
      {accountDeleted ? (
        <p className="notice-success" role="status">
          {t.accountDeleted}
        </p>
      ) : null}
      {notice ? (
        <p className="notice-success" role="status">
          {notice}
        </p>
      ) : null}
      {error ? <ErrorState message={error} /> : null}

      <form onSubmit={handleSubmit} noValidate className="login-form">
        <div>
          <label htmlFor="login-email" className="sr-only">
            {t.email}
          </label>
          <div className="login-field">
            <span className="login-field-icon">
              <MailGlyph />
            </span>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              placeholder={t.emailAddress}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {fieldErrors.email ? (
            <p className="login-field-error" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="login-password" className="sr-only">
            {t.password}
          </label>
          <div className="login-field">
            <span className="login-field-icon">
              <LockGlyph />
            </span>
            <input
              id="login-password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              required
              aria-invalid={Boolean(fieldErrors.password)}
              placeholder={t.password}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="login-eye"
              onClick={() => setPasswordVisible((current) => !current)}
              aria-label={passwordVisible ? `Hide ${t.password.toLowerCase()}` : `Show ${t.password.toLowerCase()}`}
            >
              <EyeGlyph off={passwordVisible} />
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="login-field-error" role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="login-row">
          <label className="login-remember">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            {t.rememberMe}
          </label>
          <button
            type="button"
            className="login-forgot"
            onClick={() => {
              setError(null);
              setNotice(t.forgotPasswordUnavailable);
            }}
          >
            {t.forgotPassword}
          </button>
        </div>

        {loading ? <LoadingState message={t.signingIn} /> : null}
        {googleLoading ? <LoadingState message={t.signingInGoogle} /> : null}

        <button type="submit" className="login-submit" disabled={loading || googleLoading} aria-label={t.loginSubmit}>
          <span aria-hidden="true">
            {t.loginVisualSubmit} <span className="login-submit-arrow">→</span>
          </span>
        </button>

        <div className="login-or">
          <span />
          {t.loginOr}
          <span />
        </div>

        <GoogleSignInButton
          onCredential={(value) => void handleGoogleCredential(value)}
          disabled={loading || googleLoading}
          variant="login"
        />
      </form>

      <p className="login-register">
        {t.loginNeedAccount}{" "}
        <Link
          to="/register"
          className="login-register-link"
          aria-label={t.createAnAccount}
          onClick={(event) => {
            event.preventDefault();
            navigate("/register");
          }}
        >
          {t.loginRegister}
        </Link>
      </p>

      <div className="login-lang">
        <LanguageSwitcher variant="login" />
      </div>
    </AuthSplitLayout>
  );
}
