export function GovernmentEmblem({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#0B1F4B" />
      <g fill="#F7F4EA">
        <path d="M32 8.5c2.2 4.8 5.1 7.6 10.2 9.6-3.6 1.5-6.9 2.3-10.2 2.5-3.3-.2-6.6-1-10.2-2.5C26.9 16.1 29.8 13.3 32 8.5Z" />
        <path d="M13.8 30.8c.8-8.2 6.1-13.4 12.3-15.3 2 4 4.3 6.6 7.1 8.3-7.1.8-13.6 3.4-19.4 7Z" />
        <path d="M50.2 30.8c-.8-8.2-6.1-13.4-12.3-15.3-2 4-4.3 6.6-7.1 8.3 7.1.8 13.6 3.4 19.4 7Z" />
        <ellipse cx="32" cy="22.6" rx="3.1" ry="3.6" />
        <path d="M21.2 35.6c3.4-3.6 7.4-5.1 10.8-5.3 3.4.2 7.4 1.7 10.8 5.3-3.6-1.1-7.2-1.6-10.8-1.6s-7.2.5-10.8 1.6Z" />
        <rect x="30.2" y="35.4" width="3.6" height="9.2" rx="1.3" />
      </g>
      <circle cx="32" cy="47.6" r="4.6" stroke="#D4AF37" strokeWidth="1.5" />
      <path d="M32 44.2v6.8M29 47.6h6" stroke="#D4AF37" strokeWidth="1.1" />
      <circle cx="32" cy="47.6" r="1.15" fill="#D4AF37" />
      <path d="M17.5 53.6h29M19.8 56.2h24.4M22.2 58.6h19.6" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
