import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { googleClientId } from "./components/GoogleSignInButton";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { RecommendationProvider } from "./context/RecommendationContext";
import "./index.css";

function OptionalGoogleProvider({ children }: { children: ReactNode }) {
  const clientId = googleClientId();
  if (!clientId) {
    return children;
  }
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <OptionalGoogleProvider>
        <LanguageProvider>
          <AuthProvider>
            <RecommendationProvider>
              <App />
            </RecommendationProvider>
          </AuthProvider>
        </LanguageProvider>
      </OptionalGoogleProvider>
    </BrowserRouter>
  </StrictMode>,
);
