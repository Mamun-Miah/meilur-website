type P = { className?: string };
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, focusable: false };

export function MailIcon({ className }: P) {
  return (
    <svg aria-hidden="true" {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  );
}
export function PhoneIcon({ className }: P) {
  return (
    <svg aria-hidden="true" {...base} className={className}>
      <path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
    </svg>
  );
}
export function LinkedInIcon({ className }: P) {
  return (
    <svg aria-hidden="true" {...base} className={className} fill="currentColor" stroke="none">
      <path d="M4.5 9h3v10.5h-3zM6 4.3a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5ZM9.8 9h2.9v1.5c.5-.9 1.7-1.8 3.4-1.8 3.2 0 3.9 2 3.9 4.7v6.1h-3v-5.4c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8v5.5h-3.3z" />
    </svg>
  );
}
export function TickIcon({ className }: P) {
  return (
    <svg aria-hidden="true" {...base} className={className} strokeWidth={2}>
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  );
}
