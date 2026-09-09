import { useState, type ReactNode } from "react";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-gradient-to-r from-navy-900 via-action to-accent" />
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-[300px]">
        <TopBar onOpenMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-shell flex-1 px-4 py-8 md:px-8 md:py-12 lg:px-10">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
