import { GoogleLogin } from "@react-oauth/google";
import { useI18n } from "../context/LanguageContext";

export function googleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
}

export function GoogleSignInButton({
  onCredential,
  disabled = false,
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  if (!googleClientId()) {
    return null;
  }

  return (
    <div className={`space-y-4 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <div className="flex items-center gap-3 text-[15px] font-semibold uppercase tracking-wide text-ink-500">
        <span className="h-px flex-1 bg-line" />
        {t.orContinueWith}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(response) => {
            if (response.credential) {
              onCredential(response.credential);
              return;
            }
            onCredential("");
          }}
          onError={() => onCredential("")}
          use_fedcm_for_prompt={false}
          ux_mode="popup"
          text="continue_with"
          theme="outline"
          size="large"
          shape="rectangular"
          width="320"
        />
      </div>
    </div>
  );
}
