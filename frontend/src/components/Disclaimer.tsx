import { ResearchNotice } from "./ResearchNotice";

interface DisclaimerProps {
  text?: string;
}

export function Disclaimer({ text }: DisclaimerProps) {
  if (text) {
    return (
      <aside className="rounded-xl border border-line bg-blue-50/70 px-4 py-3 text-sm text-ink-700" role="note">
        <p>{text}</p>
      </aside>
    );
  }
  return <ResearchNotice />;
}
