import { NavLink } from "react-router-dom";

const linkBase = "block rounded-lg px-4 py-2 text-sm font-medium transition";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="p-4">
      <h1 className="mb-6 text-lg font-bold">📊 Analytics</h1>

      <nav className="space-y-2">
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
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
