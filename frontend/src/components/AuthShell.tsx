import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function AuthShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  if (pathname === "/login" || pathname === "/register") {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex justify-end px-4 py-4 md:px-8">
        <LanguageSwitcher />
      </div>
      <main className="mx-auto w-full max-w-shell px-4 pb-12 md:px-8">{children}</main>
    </div>
  );
}
