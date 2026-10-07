"use client";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sizes?: number[];
}

/**
 * Reusable pagination bar (§30.4): shows "Showing X–Y of Z", Previous/Next
 * buttons, page indicator, and a rows-per-page select. Uses the same CSS
 * as the policy-coverage paginator (`.pagination-bar-case-room`).
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  sizes = [10, 25, 50],
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);

  if (total <= sizes[0]) return null;

  return (
    <div className="pagination-bar-case-room">
      <span className="pagination-info">
        Showing {start}–{end} of {total}
      </span>

      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-plain btn-page"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          ‹ Previous
        </button>
        <span className="page-indicator">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-plain btn-page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next ›
        </button>

        {onPageSizeChange && (
          <select
            className="page-size-select"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            aria-label="Rows per page"
          >
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
