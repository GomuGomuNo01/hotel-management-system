import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import EmptyState from './EmptyState';

/**
 * Squelette de chargement : reproduit la structure du tableau (en-têtes réels,
 * lignes factices animées) pour éviter le saut de mise en page et donner un
 * retour visuel immédiat — remplace l'ancien spinner plein écran.
 */
function TableSkeleton({ columns, rows = 6 }) {
  return (
    <div className="overflow-x-auto rounded-xl" aria-busy="true" aria-label="Chargement des données">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="animate-pulse">
              {columns.map((c, i) => (
                <td key={c.key} className="px-4 py-3.5">
                  {i === 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gray-200 flex-shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 rounded bg-gray-200" />
                        <div className="h-2.5 w-36 rounded bg-gray-100" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-3 rounded bg-gray-200" style={{ width: `${55 + ((r + i * 3) % 4) * 12}%` }} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * DataTable générique.
 *
 * Props optionnelles pour la sélection multiple :
 *   selectable        {boolean}  - active les checkboxes
 *   selectedIds       {Set}      - ensemble des IDs sélectionnés
 *   onSelectionChange {Function} - appelée avec le nouveau Set
 */
export default function DataTable({
  columns,
  data,
  loading,
  empty,
  emptyMessage = 'Aucune donnée à afficher.',
  page = 1,
  totalPages = 1,
  onPageChange,
  /* clic sur une ligne entière (optionnel) */
  onRowClick,
  /* selection */
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}) {
  if (loading) return <TableSkeleton columns={columns} />;
  if (empty || !data?.length) return <EmptyState message={emptyMessage} />;

  const allIds     = data.map((r) => r.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someChecked = !allChecked && allIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allChecked) {
      const next = new Set(selectedIds);
      allIds.forEach((id) => next.delete(id));
      onSelectionChange?.(next);
    } else {
      const next = new Set(selectedIds);
      allIds.forEach((id) => next.add(id));
      onSelectionChange?.(next);
    }
  };

  const toggleRow = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange?.(next);
  };

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr className="bg-gray-50">
            {selectable && (
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 cursor-pointer accent-brand-600"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll}
                  aria-label="Tout sélectionner"
                />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((row, idx) => {
            const isSelected = selectable && selectedIds.has(row.id);
            return (
              <tr
                key={row.id ?? idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
                  isSelected
                    ? 'bg-brand-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 cursor-pointer accent-brand-600"
                      checked={isSelected}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Sélectionner ligne ${row.id}`}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-gray-700">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
          <span className="text-xs text-gray-500">
            Page <span className="font-semibold text-gray-700">{page}</span> sur{' '}
            <span className="font-semibold text-gray-700">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => onPageChange?.(1)} title="Première page">
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button className="btn-ghost h-8 w-8 p-0" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} title="Page précédente">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-ghost h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} title="Page suivante">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button className="btn-ghost h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => onPageChange?.(totalPages)} title="Dernière page">
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
