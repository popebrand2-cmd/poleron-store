// The admin back-office wears the same black + neon POPE look as the
// storefront; the remapping of its light utility classes lives in
// globals.css under .admin-dark.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-dark min-h-screen">
      <div className="h-1 bg-neon" />
      {children}
    </div>
  );
}
