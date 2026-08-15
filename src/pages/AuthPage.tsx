import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/use-auth";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";

  if (user) return <Navigate to="/datasets" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await (isRegister ? register(email, password) : login(email, password));
      const state = location.state as { from?: string } | null;
      navigate(state?.from ?? "/datasets", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">📊 Analytics Dashboard</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isRegister
              ? "Your uploaded datasets will be private to this account."
              : "Sign in to access your saved datasets."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Password
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 10 : undefined}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {isRegister && <span className="mt-1 block text-xs font-normal text-slate-500">Use at least 10 characters.</span>}
          </label>

          {error && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <Link className="font-medium text-blue-600 hover:underline dark:text-blue-400" to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
