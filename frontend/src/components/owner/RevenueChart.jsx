import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatXOF } from '../../utils/formatCurrency';
import { BRAND_COLOR, ACCENT_COLOR } from '../../config/brand';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatTick = (d) => {
  try { return format(parseISO(d), 'd MMM', { locale: fr }); }
  catch { return d; }
};

export default function RevenueChart({ data = [] }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" className="dark:opacity-20" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatTick} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            labelFormatter={formatTick}
            formatter={(v, name) => [formatXOF(v), name === 'total' ? 'Total' : (name === 'orange_ci' ? 'Orange CI' : 'Wave CI')]}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
          />
          <Legend formatter={(v) => v === 'total' ? 'Total' : (v === 'orange_ci' ? 'Orange CI' : 'Wave CI')} />
          <Line type="monotone" dataKey="orange_ci" stroke={ACCENT_COLOR} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="wave_ci"   stroke="#0EA5E9"      strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="total"     stroke={BRAND_COLOR}  strokeWidth={2.5} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
