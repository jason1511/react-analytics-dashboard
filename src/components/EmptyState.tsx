import { Link } from "react-router-dom";

type Props = {
  title: string;
  description: string;
  actionText?: string;
  actionTo?: string;
};

export default function EmptyState({
  title,
  description,
  actionText = "Upload data",
  actionTo = "/upload",
}: Props) {
  return (
    <div
      className="rounded-xl border p-6 shadow-sm
                 bg-white border-slate-200
                 dark:bg-slate-900 dark:border-slate-800"
    >
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h2>

      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>

      <div className="mt-4">
        <Link
          to={actionTo}
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium
                     bg-slate-900 text-white hover:bg-slate-800
                     dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {actionText}
        </Link>
      </div>
    </div>
  );
}
