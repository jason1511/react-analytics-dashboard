import { NavLink } from "react-router-dom";
import { useTheme } from "../state/use-theme";

const linkBase = "block rounded-lg px-4 py-2 text-sm font-medium transition";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isDark, toggle } = useTheme();

  return (
    <div className="flex h-full flex-col p-4">
      {/* Header */}
      <h1 className="mb-6 text-lg font-bold text-slate-900 dark:text-slate-100">
        📊 Analytics
      </h1>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {[
          { to: "/dashboard", label: "Dashboard" },
          { to: "/upload", label: "Upload" },
          { to: "/explore", label: "Explore" },
        ].map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Theme toggle */}
      <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          onClick={toggle}
          className="
            flex w-full items-center justify-between rounded-lg
            border border-slate-200 px-3 py-2 text-sm font-medium
            bg-white text-slate-700 hover:bg-slate-50
            dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
            dark:hover:bg-slate-800
          "
          aria-label="Toggle theme"
        >
          <span>{isDark ? "Dark mode" : "Light mode"}</span>
          <span className="text-base">{isDark ? "🌙" : "☀️"}</span>
        </button>
      </div>
    </div>
  );
}
