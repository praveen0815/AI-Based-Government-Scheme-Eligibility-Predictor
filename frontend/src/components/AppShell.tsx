import { useEffect, useState, type ReactNode } from "react";
import { useCitizenTheme } from "../context/CitizenThemeContext";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { theme } = useCitizenTheme();

  useEffect(() => {
    document.documentElement.classList.add("citizen-boot");
    return () => document.documentElement.classList.remove("citizen-boot");
  }, []);

  return (
    <div className="citizen-portal min-h-screen" data-citizen-theme={theme}>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="citizen-workspace flex min-h-screen flex-col lg:pl-[280px]">
        <TopBar onOpenMenu={() => setOpen(true)} />
        <main className="citizen-main mx-auto w-full max-w-shell flex-1 px-4 py-8 md:px-8 md:py-12 lg:px-10">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
