import { ResearchNotice } from "./ResearchNotice";

interface DisclaimerProps {
  text?: string;
}

export function Disclaimer({ text }: DisclaimerProps) {
  if (text) {
    return (
      <aside className="rounded-[14px] border border-line bg-sage/80 px-5 py-4 text-[16px] leading-relaxed text-ink-700 sm:text-[17px]" role="note">
        <p>{text}</p>
      </aside>
    );
  }
  return <ResearchNotice />;
}
