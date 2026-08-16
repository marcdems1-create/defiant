export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[400] overflow-auto bg-paper text-ink">
      {children}
    </div>
  );
}
