import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatXOF } from '../../utils/formatCurrency';

const PROVIDER_LABEL = {
  orange_ci: 'Orange CI',
  wave_ci:   'Wave CI',
};
const PROVIDER_COLOR = {
  orange_ci: '#f97316',
  wave_ci:   '#3b82f6',
};

export default function PaymentMixChart({ data = [] }) {
  // Normalise either {provider, amount}[] or {name, value}[]
  const rows = data.map((d) => ({
    name:  d.name  ?? PROVIDER_LABEL[d.provider] ?? d.provider,
    value: d.value ?? d.amount ?? 0,
    key:   d.provider ?? d.name,
  }));

  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-gray-400">
        Aucune donnée de paiement.
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" outerRadius={90} innerRadius={45} paddingAngle={2}>
            {rows.map((r, i) => (
              <Cell key={i} fill={PROVIDER_COLOR[r.key] || '#a3a3a3'} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatXOF(v)} contentStyle={{ borderRadius: 8 }} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
