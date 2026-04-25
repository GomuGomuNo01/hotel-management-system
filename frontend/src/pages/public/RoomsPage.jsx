import { useState } from 'react';
import RoomCard from '../../components/rooms/RoomCard';
import RoomFilters from '../../components/rooms/RoomFilters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useRooms } from '../../hooks/useRooms';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function RoomsPage() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, refetch } = useRooms({ ...filters, page });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-4">Nos chambres</h1>
      <RoomFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />

      <div className="mt-6">
        {loading ? (
          <LoadingSpinner label="Chargement des chambres…" />
        ) : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : !data.length ? (
          <EmptyState message="Aucune chambre ne correspond à vos critères." />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((r) => <RoomCard key={r.id} room={r} />)}
            </div>
            {meta?.last_page > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </button>
                <span className="text-sm text-gray-600">Page {meta.current_page} / {meta.last_page}</span>
                <button className="btn-secondary" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
