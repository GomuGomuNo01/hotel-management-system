import { describe, it, expect } from 'vitest';
import { overlaps, assignLanes, findConflicts, barGeometry } from './planning';

describe('overlaps', () => {
  it('détecte un chevauchement', () => {
    expect(overlaps('2026-06-10', '2026-06-15', '2026-06-12', '2026-06-18')).toBe(true);
  });

  it('considère deux séjours adjacents (départ = arrivée) comme non chevauchants', () => {
    // Un client part le 15, un autre arrive le 15 : pas de conflit.
    expect(overlaps('2026-06-10', '2026-06-15', '2026-06-15', '2026-06-20')).toBe(false);
  });

  it('détecte l\'absence de chevauchement', () => {
    expect(overlaps('2026-06-10', '2026-06-12', '2026-06-14', '2026-06-16')).toBe(false);
  });
});

describe('assignLanes', () => {
  it('place des séjours qui ne se chevauchent pas sur la même lane', () => {
    const laned = assignLanes([
      { id: 1, check_in_date: '2026-06-10', check_out_date: '2026-06-12' },
      { id: 2, check_in_date: '2026-06-13', check_out_date: '2026-06-15' },
    ]);
    expect(laned.every((r) => r.lane === 0)).toBe(true);
  });

  it('réutilise la lane quand le départ précède l\'arrivée suivante (adjacence)', () => {
    const laned = assignLanes([
      { id: 1, check_in_date: '2026-06-10', check_out_date: '2026-06-15' },
      { id: 2, check_in_date: '2026-06-15', check_out_date: '2026-06-18' },
    ]);
    expect(laned.find((r) => r.id === 2).lane).toBe(0);
  });

  it('empile deux séjours qui se chevauchent sur des lanes distinctes', () => {
    const laned = assignLanes([
      { id: 1, check_in_date: '2026-06-10', check_out_date: '2026-06-16' },
      { id: 2, check_in_date: '2026-06-12', check_out_date: '2026-06-18' },
    ]);
    const lanes = laned.map((r) => r.lane).sort();
    expect(lanes).toEqual([0, 1]);
  });
});

describe('findConflicts', () => {
  it('retourne les ids des séjours qui se chevauchent sur une même chambre', () => {
    const rooms = [
      { id: 1, reservations: [
        { id: 10, check_in_date: '2026-06-10', check_out_date: '2026-06-16' },
        { id: 11, check_in_date: '2026-06-12', check_out_date: '2026-06-18' },
      ] },
      { id: 2, reservations: [
        { id: 20, check_in_date: '2026-06-10', check_out_date: '2026-06-12' },
        { id: 21, check_in_date: '2026-06-12', check_out_date: '2026-06-15' },
      ] },
    ];
    const conflicts = findConflicts(rooms);
    expect(conflicts.has(10)).toBe(true);
    expect(conflicts.has(11)).toBe(true);
    // Chambre 2 : séjours adjacents, aucun conflit.
    expect(conflicts.has(20)).toBe(false);
    expect(conflicts.has(21)).toBe(false);
  });

  it('gère une chambre sans réservation', () => {
    expect(findConflicts([{ id: 1, reservations: [] }]).size).toBe(0);
  });
});

describe('barGeometry', () => {
  const from = new Date(2026, 5, 10); // 10 juin 2026 (mois 0-indexé)

  it('calcule la position et la largeur dans la fenêtre', () => {
    const g = barGeometry({ check_in_date: '2026-06-12', check_out_date: '2026-06-15' }, from, 14);
    expect(g.startIdx).toBe(2);
    expect(g.endIdx).toBe(5);
    expect(g.span).toBe(3); // 3 nuits = 3 colonnes
  });

  it('borne un séjour qui déborde au début de la fenêtre', () => {
    const g = barGeometry({ check_in_date: '2026-06-05', check_out_date: '2026-06-13' }, from, 14);
    expect(g.startIdx).toBe(0);
    expect(g.span).toBe(3);
  });

  it('borne un séjour qui déborde à la fin de la fenêtre', () => {
    const g = barGeometry({ check_in_date: '2026-06-22', check_out_date: '2026-06-30' }, from, 14);
    expect(g.endIdx).toBe(14);
    expect(g.startIdx).toBe(12);
    expect(g.span).toBe(2);
  });

  it('retourne un span nul ou négatif pour un séjour hors fenêtre', () => {
    const g = barGeometry({ check_in_date: '2026-07-01', check_out_date: '2026-07-05' }, from, 14);
    expect(g.span).toBeLessThanOrEqual(0);
  });
});
