import { useState } from 'react';
import { formatXOF } from '../../../utils/formatCurrency';

/**
 * Graphiques SVG natifs (sans dépendance externe) du rapport financier,
 * extraits de AdminReportsPage. Composants purs pilotés par props.
 */

/** Formatage compact pour les axes SVG */
function compactXOF(v) {
  if (!v) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

/**
 * Graphique en barres SVG - 12 mois.
 * Approche SVG avec coordonnées explicites pour éviter les problèmes CSS %.
 */
export function SvgBarChart({ data = [], valueKey = 'total', labelFn = (x) => x, color = '#3b82f6' }) {
  const [hovered, setHovered] = useState(null);

  // Dimensions virtuelles (viewBox) - le SVG sera responsive via CSS
  const W = 800, H = 240;
  const PT = 12, PR = 12, PB = 44, PL = 72; // padding top/right/bottom/left
  const cW = W - PL - PR; // largeur zone chart
  const cH = H - PT - PB; // hauteur zone chart

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400 italic">
        Aucune donnée disponible pour la période sélectionnée.
      </div>
    );
  }

  const values = data.map((d) => d[valueKey] ?? 0);
  const max    = Math.max(...values, 1);

  const spacing = cW / data.length;
  const barW    = Math.max(6, spacing * 0.6);
  const barOff  = (spacing - barW) / 2;

  const xOf = (i) => PL + i * spacing + barOff;
  const hOf = (v) => (v / max) * cH;

  // 5 lignes de grille horizontale
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    f,
    y:   PT + cH * (1 - f),
    val: max * f,
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
      style={{ height: 240, overflow: 'visible' }}
    >
      {/* Grille horizontale */}
      {ticks.map(({ f, y, val }) => (
        <g key={f}>
          <line
            x1={PL} y1={y} x2={W - PR} y2={y}
            stroke={f === 0 ? '#cbd5e1' : '#e2e8f0'}
            strokeWidth={f === 0 ? 1.5 : 1}
            strokeDasharray={f > 0 ? '4 4' : ''}
          />
          <text x={PL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="system-ui,sans-serif">
            {compactXOF(val)}
          </text>
        </g>
      ))}

      {/* Barres */}
      {data.map((d, i) => {
        const v  = d[valueKey] ?? 0;
        const x  = xOf(i);
        const bH = Math.max(v > 0 ? 2 : 0, hOf(v));
        const y  = PT + cH - bH;
        const isH = hovered === i;
        const label = labelFn(d);

        return (
          <g
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'default' }}
          >
            {/* Barre */}
            <rect
              x={x} y={y}
              width={barW} height={bH}
              rx={3} ry={3}
              fill={isH ? color : color + 'aa'}
              style={{ transition: 'fill 0.15s' }}
            />

            {/* Tooltip SVG */}
            {isH && v > 0 && (() => {
              const tx = Math.min(Math.max(x + barW / 2, PL + 50), W - PR - 50);
              const ty = y - 10;
              return (
                <g>
                  <rect x={tx - 52} y={ty - 24} width={104} height={26} rx={5} fill="#1e293b" />
                  <text x={tx} y={ty - 6} textAnchor="middle" fontSize="11" fill="white" fontWeight="bold" fontFamily="system-ui,sans-serif">
                    {formatXOF(v)}
                  </text>
                </g>
              );
            })()}

            {/* Label axe X */}
            <text
              x={x + barW / 2} y={H - 6}
              textAnchor="middle" fontSize="10"
              fill={isH ? '#475569' : '#94a3b8'}
              fontWeight={isH ? 'bold' : 'normal'}
              fontFamily="system-ui,sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Graphique journalier (sparkline barres) - mois en cours
 */
export function SvgDailyChart({ data = [] }) {
  const [hovered, setHovered] = useState(null);

  const W = 800, H = 160;
  const PT = 8, PR = 12, PB = 36, PL = 52;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  const today   = new Date().getDate();

  // Construire tableau complet 1..today avec 0 pour jours sans données
  const byDay = {};
  data.forEach((d) => { byDay[d.day] = d.total; });
  const fullData = Array.from({ length: today }, (_, i) => ({
    day:   i + 1,
    total: byDay[i + 1] ?? 0,
  }));

  if (!fullData.length) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-slate-400 italic">
        Aucun paiement enregistré ce mois.
      </div>
    );
  }

  const max    = Math.max(...fullData.map((d) => d.total), 1);
  const spacing = cW / today;
  const barW   = Math.max(3, spacing * 0.7);
  const barOff = (spacing - barW) / 2;

  const ticks = [0, 0.5, 1].map((f) => ({ f, y: PT + cH * (1 - f), val: max * f }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full" style={{ height: 160, overflow: 'visible' }}>
      {/* Grille */}
      {ticks.map(({ f, y, val }) => (
        <g key={f}>
          <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={f === 0 ? '#cbd5e1' : '#e2e8f0'} strokeWidth={f === 0 ? 1.5 : 1} strokeDasharray={f > 0 ? '3 3' : ''} />
          <text x={PL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="system-ui,sans-serif">{compactXOF(val)}</text>
        </g>
      ))}

      {/* Barres */}
      {fullData.map((d, i) => {
        const bH  = Math.max(d.total > 0 ? 2 : 0, (d.total / max) * cH);
        const x   = PL + i * spacing + barOff;
        const y   = PT + cH - bH;
        const isH = hovered === i;

        return (
          <g key={d.day} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'default' }}>
            <rect
              x={x} y={y} width={barW} height={bH} rx={2} ry={2}
              fill={d.total === 0 ? '#e2e8f0' : isH ? '#10b981' : '#34d39988'}
              style={{ transition: 'fill 0.15s' }}
            />
            {/* Label jour (tous les 5) */}
            {(d.day === 1 || d.day % 5 === 0) && (
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="system-ui,sans-serif">
                {d.day}
              </text>
            )}
            {/* Tooltip */}
            {isH && d.total > 0 && (() => {
              const tx = Math.min(Math.max(x + barW / 2, PL + 45), W - PR - 45);
              return (
                <g>
                  <rect x={tx - 45} y={y - 28} width={90} height={22} rx={4} fill="#1e293b" />
                  <text x={tx} y={y - 13} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold" fontFamily="system-ui,sans-serif">
                    J{d.day} · {compactXOF(d.total)}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}
