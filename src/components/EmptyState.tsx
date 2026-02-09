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
  actionText = "Upload a CSV",
  actionTo = "/upload",
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      <div className="mt-4">
        <Link
          to={actionTo}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {actionText}
        </Link>
      </div>
    </div>
  );
}
