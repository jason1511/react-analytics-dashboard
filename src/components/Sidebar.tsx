import { NavLink } from "react-router-dom";

const linkBase =
  "block rounded-lg px-4 py-2 text-sm font-medium transition";

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-white border-r p-4">
      <h1 className="text-lg font-bold mb-6">📊 Analytics</h1>

      <nav className="space-y-2">
        {[
          { to: "/dashboard", label: "Dashboard" },
          { to: "/upload", label: "Upload" },
          { to: "/explore", label: "Explore" },
        ].map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
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
    </aside>
  );
}
