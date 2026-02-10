import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useTheme } from "../state/use-theme";

export default function AppShell() {
  const { isDark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <span className="text-lg">📊</span>
            <span>Analytics</span>
          </div>

          <button
            onClick={toggle}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
          >
            {isDark ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      {/* IMPORTANT: h-screen + overflow-hidden */}
      <div className="flex h-[calc(100vh-0px)] w-full overflow-hidden">
        {/* Desktop sidebar: sticky + own scroll */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:block">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <Sidebar />
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />

            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl dark:bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <span className="text-lg">📊</span>
                  <span>Analytics</span>
                </div>
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              <div className="h-[calc(100%-52px)] overflow-y-auto">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Main content scrolls */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
