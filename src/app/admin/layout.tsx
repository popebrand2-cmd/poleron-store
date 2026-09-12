// The storefront (home, product, cart, checkout) uses a dark brand theme,
// but the admin back-office stays plain/light for readability — this
// wrapper opts every /admin/* page back into light colors explicitly so it
// doesn't inherit the dark body background/text from globals.css.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-50 text-neutral-900">{children}</div>;
}
