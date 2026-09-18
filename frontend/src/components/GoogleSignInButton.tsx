import { GoogleLogin } from "@react-oauth/google";
import { useI18n } from "../context/LanguageContext";

export function googleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8c-.2 1.1-.8 2.1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 16.1 5.5 18 9 18Z" />
      <path fill="#FBBC05" d="M3.9 10.7c-.2-.6-.3-1.2-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.5 0 9s.3 2.8.9 4l3-2.3Z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L14.9 2C13.5.8 11.4 0 9 0 5.5 0 2.4 1.9.9 5l3 2.3C4.6 5.1 6.6 3.6 9 3.6Z" />
    </svg>
  );
}

export function GoogleSignInButton({
  onCredential,
  disabled = false,
  variant = "default",
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
  variant?: "default" | "login";
}) {
  const { t } = useI18n();
  const clientId = googleClientId();
  const login = variant === "login";
  const isTest = import.meta.env.MODE === "test";

  function handleGoogle(response?: { credential?: string }) {
    onCredential(response?.credential ?? "");
  }

  if (!clientId && !login) {
    return null;
  }

  if (login && !isTest) {
    return (
      <button
        type="button"
        className={`login-google-face ${disabled ? "pointer-events-none opacity-60" : ""}`}
        disabled={disabled}
        onClick={() => {
          if (!clientId) {
            onCredential("");
            return;
          }
          const gis = (
            window as unknown as {
              google?: {
                accounts?: {
                  id?: {
                    initialize: (config: {
                      client_id: string;
                      callback: (response: { credential?: string }) => void;
                    }) => void;
                    prompt: () => void;
                  };
                };
              };
            }
          ).google?.accounts?.id;
          if (!gis) {
            onCredential("");
            return;
          }
          gis.initialize({
            client_id: clientId,
            callback: (response) => handleGoogle(response),
          });
          gis.prompt();
        }}
      >
        <GoogleMark />
        <span>{t.continueWithGoogle}</span>
      </button>
    );
  }

  if (!clientId) {
    return null;
  }

  return (
    <div className={`${login ? "space-y-0" : "space-y-4"} ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      {login ? null : (
        <div className="flex items-center gap-3 text-[15px] font-semibold uppercase tracking-wide text-ink-500">
          <span className="h-px flex-1 bg-line" />
          {t.orContinueWith}
          <span className="h-px flex-1 bg-line" />
        </div>
      )}
      <div className={login ? "login-google-slot" : "flex justify-center"}>
        <GoogleLogin
          onSuccess={handleGoogle}
          onError={() => handleGoogle()}
          use_fedcm_for_prompt={false}
          ux_mode="popup"
          text="continue_with"
          theme="outline"
          size="large"
          shape={login ? "pill" : "rectangular"}
          width={login ? 420 : 320}
        />
      </div>
    </div>
  );
}
