import Link from "next/link";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fdf6e3,_#f5f1e9_40%,_#ece7dd_100%)] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-slate-900">
            Supplier Risk Cockpit
          </Link>
          <nav className="flex items-center gap-6 text-sm font-semibold text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/exceptions" className="hover:text-slate-900">
              Exceptions
            </Link>
            <Link href="/about" className="hover:text-slate-900">
              About
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-10">{children}</main>
    </div>
  );
}
