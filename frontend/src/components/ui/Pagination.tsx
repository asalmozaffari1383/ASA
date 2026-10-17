export const PAGE_SIZE = 20; // mirrors DRF REST_FRAMEWORK["PAGE_SIZE"]

/**
 * Prev/next pager driven by the DRF ``count``. Renders nothing when everything
 * fits on a single page. RTL: "previous" (newer page numbers to the right).
 */
export function Pagination({
  page,
  count,
  onChange,
}: {
  page: number;
  count: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-2 text-sm">
      <button
        type="button"
        className="rounded-lg px-3 py-1.5 ring-1 ring-slate-300 disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        قبلی
      </button>
      <span className="text-slate-500">
        صفحه {page} از {totalPages}
      </span>
      <button
        type="button"
        className="rounded-lg px-3 py-1.5 ring-1 ring-slate-300 disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        بعدی
      </button>
    </div>
  );
}
