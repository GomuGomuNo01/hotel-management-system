import { Search } from 'lucide-react';

const TYPES = [
  { value: '', label: 'Tous types' },
  { value: 'simple', label: 'Simple' },
  { value: 'double', label: 'Double' },
  { value: 'suite', label: 'Suite' },
  { value: 'familiale', label: 'Familiale' },
];

export default function RoomFilters({ filters, onChange }) {
  const update = (k, v) => onChange({ ...filters, [k]: v });
  return (
    <div className="card card-pad grid gap-3 md:grid-cols-5">
      <div>
        <label className="label">Type</label>
        <select className="input" value={filters.room_type || ''} onChange={(e) => update('room_type', e.target.value)}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Prix min</label>
        <input className="input" type="number" min="0" value={filters.price_min || ''} onChange={(e) => update('price_min', e.target.value)} placeholder="0" />
      </div>
      <div>
        <label className="label">Prix max</label>
        <input className="input" type="number" min="0" value={filters.price_max || ''} onChange={(e) => update('price_max', e.target.value)} placeholder="100000" />
      </div>
      <div>
        <label className="label">Capacité min</label>
        <input className="input" type="number" min="1" value={filters.capacity || ''} onChange={(e) => update('capacity', e.target.value)} placeholder="1" />
      </div>
      <div className="flex items-end">
        <button className="btn-primary w-full" onClick={() => onChange({ ...filters })}>
          <Search className="h-4 w-4" /> Rechercher
        </button>
      </div>
    </div>
  );
}
