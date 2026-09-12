// Small fixed icon palette used by the homepage's editable lists (values,
// how-it-works steps, trust badges). Admins pick from this set instead of
// uploading arbitrary SVGs — keeps the visual style consistent.
const PATHS: Record<string, React.ReactNode> = {
  upload: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0L8 8m4-4l4 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  shirt: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4L4 7v3h3v10h10V10h3V7l-4-3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4a4 4 0 0 0 8 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
    </>
  ),
  edit: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l3.5-1 10-10a1.5 1.5 0 0 0 0-2.1L16 5.4a1.5 1.5 0 0 0-2.1 0l-10 10L3 19l1 1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 6.5l4.5 4.5" />
    </>
  ),
  box: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8l8-4 8 4-8 4-8-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8v8l8 4 8-4V8M12 12v8" />
    </>
  ),
  shield: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path strokeLinecap="round" d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  truck: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16V6a1 1 0 0 1 1-1h9v11" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 9h4l3 3v4h-7" />
      <circle cx="7.5" cy="17.5" r="1.7" />
      <circle cx="16.5" cy="17.5" r="1.7" />
    </>
  ),
  refresh: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 3v4h-4M6.5 21v-4h4" />
    </>
  ),
  heart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 20s-7-4.35-9.5-8.5C.7 8.1 2.2 5 5.5 5c1.8 0 3.3 1 4.5 2.6C11.2 6 12.7 5 14.5 5 17.8 5 19.3 8.1 21.5 11.5 19 15.65 12 20 12 20z"
    />
  ),
  star: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z"
    />
  ),
};

export const ICON_KEYS = Object.keys(PATHS);

export default function Icon({ name, className }: { name: string; className?: string }) {
  const path = PATHS[name] ?? PATHS.star;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      {path}
    </svg>
  );
}
