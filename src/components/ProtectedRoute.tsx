import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../state/use-auth";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        Restoring your session…
      </div>
    );
  }

  return user
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
