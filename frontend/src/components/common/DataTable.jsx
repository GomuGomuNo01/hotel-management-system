import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  data,
  loading,
  empty,
  emptyMessage = 'Aucune donnée à afficher.',
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  if (loading) return <LoadingSpinner label="Chargement…" />;
  if (empty || !data?.length) return <EmptyState message={emptyMessage} />;

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/60">
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {data.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-700 dark:text-gray-200">{page}</span> sur{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              className="btn-ghost h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => onPageChange?.(1)}
              title="Première page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              className="btn-ghost h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              title="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="btn-ghost h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              title="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              className="btn-ghost h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(totalPages)}
              title="Dernière page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
