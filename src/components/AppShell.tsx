import { useEffect, useState } from "react";
import { Menu, Moon, Sun, Upload } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../state/use-auth";
import { useDataset } from "../state/use-dataset";
import { useTheme } from "../state/use-theme";
import Sidebar from "./Sidebar";

function WorkspaceHeader({ onOpenMenu }: Readonly<{ onOpenMenu: () => void }>) {
  const { datasetId, fileName, rows, columns } = useDataset();
  const { isGuest, user } = useAuth();
  const { isDark, toggle } = useTheme();
  const hasDataset = rows.length > 0;
  const status = !hasDataset ? "No dataset" : isGuest ? "Local only" : datasetId ? "Saved" : "Current session";

  return (
    <header className="relative z-30 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <button
          type="button"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white md:hidden"
          onClick={onOpenMenu}
          aria-label="Open navigation"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            Active dataset
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            <span
              className={`size-2 shrink-0 rounded-full ${hasDataset ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {fileName || "No dataset loaded"}
            </span>
            <span className="hidden shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:inline-flex">
              {status}
            </span>
            {hasDataset ? (
              <span className="hidden shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400 lg:inline">
                {rows.length.toLocaleString()} rows · {columns.length.toLocaleString()} columns
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/upload"
            aria-label="Import data"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:ring-offset-slate-950"
          >
            <Upload size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Import data</span>
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            title={isDark ? "Use light theme" : "Use dark theme"}
            aria-label={isDark ? "Use light theme" : "Use dark theme"}
          >
            {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
          <div className="hidden min-w-0 items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800 xl:flex">
            <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {isGuest ? "G" : user?.username?.slice(0, 1) || "U"}
            </div>
            <div className="max-w-32 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {isGuest ? "Guest" : user?.username}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:block">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHeader onOpenMenu={() => setMobileOpen(true)} />
        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside
            className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            aria-label="Mobile navigation"
            aria-modal="true"
            role="dialog"
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
