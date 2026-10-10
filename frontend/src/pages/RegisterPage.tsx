import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  AuthSplitLayout,
  EyeGlyph,
  LockGlyph,
  MailGlyph,
  PhoneGlyph,
  UserGlyph,
} from "../components/AuthSplitLayout";
import { ErrorState } from "../components/ErrorState";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { ApiError, loginWithGoogle, registerAccount } from "../services/api";
import { signedInHomePath } from "../utils/homePath";

function isValidMobile(value: string): boolean {
  return /^\+?[0-9]{10,15}$/.test(value.replace(/[\s-]/g, ""));
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
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
    if (!isValidMobile(mobile.trim())) nextErrors.mobile = t.mobileRequired;
    if (!acceptedTerms) nextErrors.terms = t.termsRequired;
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

  if (isAuthenticated) {
    return <Navigate to={signedInHomePath(user)} replace />;
  }

  return (
    <AuthSplitLayout cardLabel={t.registerTitle} tall>
      <header className="login-heading">
        <h1>{t.registerTitle}</h1>
        <p>{t.registerLead}</p>
      </header>
      {error ? <ErrorState message={error} /> : null}
      <form onSubmit={handleSubmit} noValidate className="login-form">
        <div>
          <label htmlFor="register-name" className="sr-only">
            {t.fullName}
          </label>
          <div className="login-field">
            <span className="login-field-icon">
              <UserGlyph />
            </span>
            <input
              id="register-name"
              required
              aria-invalid={Boolean(fieldErrors.fullName)}
              placeholder={`${t.fullName} *`}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          {fieldErrors.fullName ? (
            <p className="login-field-error" role="alert">
              {fieldErrors.fullName}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-email" className="sr-only">
            {t.email}
          </label>
          <div className="login-field">
            <span className="login-field-icon">
              <MailGlyph />
            </span>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              placeholder={`${t.emailAddress} *`}
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
          <label htmlFor="register-password" className="sr-only">
            {t.password}
          </label>
          <div className="login-field">
            <span className="login-field-icon">
              <LockGlyph />
            </span>
            <input
              id="register-password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="new-password"
              required
              aria-invalid={Boolean(fieldErrors.password)}
              placeholder={`${t.password} *`}
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
          <p className="login-field-hint">{t.passwordHint}</p>
          {fieldErrors.password ? (
            <p className="login-field-error" role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-confirm" className="sr-only">
            {t.confirmPassword}
          </label>
          <div className="login-field">
            <span className="login-field-icon">
              <LockGlyph />
            </span>
            <input
              id="register-confirm"
              type={confirmVisible ? "text" : "password"}
              autoComplete="new-password"
              required
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              placeholder={`${t.confirmPassword} *`}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              type="button"
              className="login-eye"
              onClick={() => setConfirmVisible((current) => !current)}
              aria-label={confirmVisible ? `Hide ${t.confirmPassword.toLowerCase()}` : `Show ${t.confirmPassword.toLowerCase()}`}
            >
              <EyeGlyph off={confirmVisible} />
            </button>
          </div>
          {fieldErrors.confirmPassword ? (
            <p className="login-field-error" role="alert">
              {fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="register-mobile" className="sr-only">
            {t.mobileNumber}
          </label>
          <div className="login-field">
            <span className="login-field-icon">
              <PhoneGlyph />
            </span>
            <input
              id="register-mobile"
              type="tel"
              autoComplete="tel"
              required
              aria-invalid={Boolean(fieldErrors.mobile)}
              placeholder={`${t.mobileNumber} *`}
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
            />
          </div>
          {fieldErrors.mobile ? (
            <p className="login-field-error" role="alert">
              {fieldErrors.mobile}
            </p>
          ) : null}
        </div>

        <div>
          <label className="login-remember">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
            {t.termsAgree}
          </label>
          {fieldErrors.terms ? (
            <p className="login-field-error" role="alert">
              {fieldErrors.terms}
            </p>
          ) : null}
        </div>

        {loading ? <LoadingState message={t.creatingAccount} /> : null}
        {googleLoading ? <LoadingState message={t.signingInGoogle} /> : null}

        <button type="submit" className="login-submit" disabled={loading || googleLoading} aria-label={t.createAccount}>
          <span aria-hidden="true">
            {t.createAccount} <span className="login-submit-arrow">→</span>
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
        {t.alreadyHaveAccount}{" "}
        <Link to="/login" className="login-register-link">
          {t.signIn}
        </Link>
      </p>

      <div className="login-lang">
        <LanguageSwitcher variant="login" />
      </div>
    </AuthSplitLayout>
  );
}
