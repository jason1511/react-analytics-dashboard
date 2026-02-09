import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="text-lg">📊</span>
            <span>Analytics</span>
          </div>

          {/* spacer so title stays centered */}
          <div className="w-[44px]" />
        </div>
      </header>

      <div className="flex w-full">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r bg-white md:block min-h-screen">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <button
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />

            {/* Drawer */}
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="text-lg">📊</span>
                  <span>Analytics</span>
                </div>
                <button
                  className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
