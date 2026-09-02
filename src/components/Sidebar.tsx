import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ChartNoAxesCombined,
  ChevronRight,
  CircleUserRound,
  Database,
  FileSearch,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  ShieldCheck,
  Table2,
  Upload,
  X,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../state/use-auth";

type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Analyse",
    items: [
      { to: "/explore", label: "Explore data", icon: Table2 },
      { to: "/profile", label: "Column profile", icon: FileSearch },
      { to: "/quality", label: "Data quality", icon: ShieldCheck },
      { to: "/insights", label: "Insights", icon: Lightbulb },
    ],
  },
  {
    label: "Create",
    items: [{ to: "/charts", label: "Chart builder", icon: ChartNoAxesCombined }],
  },
  {
    label: "Data",
    items: [
      { to: "/datasets", label: "Datasets", icon: Database },
      { to: "/upload", label: "Import data", icon: Upload },
    ],
  },
];

function NavigationLink({ item, onNavigate }: Readonly<{ item: NavigationItem; onNavigate?: () => void }>) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) => [
        "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isActive
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
      ].join(" ")}
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          {isActive ? <ChevronRight size={15} aria-hidden="true" /> : null}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({
  onNavigate,
  onClose,
}: Readonly<{ onNavigate?: () => void; onClose?: () => void }>) {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-4 dark:border-slate-800">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
            <BarChart3 size={20} strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-950 dark:text-white">Analytics</span>
            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">Data workspace</span>
          </span>
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-2 inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Primary navigation">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavigationLink key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <CircleUserRound size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isGuest ? "Guest" : user?.username}
            </span>
            <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
              {isGuest ? "Browser-only session" : "Private workspace"}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            onNavigate?.();
            navigate("/login", { replace: true });
          }}
          className="mt-1 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
        >
          <LogOut size={17} aria-hidden="true" />
          {isGuest ? "Exit guest mode" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
