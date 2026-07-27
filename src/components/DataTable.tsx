import type { ReactNode } from "react";
import Skeleton from "./Skeleton";

export interface Column<T extends { id: string }> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  /** Render shimmer rows instead of `empty` while the data is still in flight. */
  loading?: boolean;
  /** How many shimmer rows to draw. Default 4. */
  skeletonRows?: number;
}

export default function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty = "Không có dữ liệu.",
  loading = false,
  skeletonRows = 4,
}: DataTableProps<T>) {
  // Keep showing already-loaded rows during a refetch; only the first load is blank.
  const showSkeleton = loading && rows.length === 0;

  return (
    <div className="table-shell">
      <table className="data-table" aria-busy={loading || undefined}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {showSkeleton ? (
            Array.from({ length: skeletonRows }, (_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`}>
                {columns.map((col) => (
                  <td key={col.key} className="skeleton-cell">
                    <Skeleton width={rowIndex % 2 === 0 ? "70%" : "55%"} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty-state">{empty}</div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
