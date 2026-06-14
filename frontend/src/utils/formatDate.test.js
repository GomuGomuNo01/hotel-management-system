import { describe, it, expect } from 'vitest';
import { formatDate, nightsBetween } from './formatDate';

describe('formatDate', () => {
  it('formate une date ISO au format jj/MM/aaaa', () => {
    expect(formatDate('2026-06-14')).toBe('14/06/2026');
  });

  it('retourne un tiret pour une valeur vide', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });

  it('accepte un motif personnalisé', () => {
    expect(formatDate('2026-06-14', 'yyyy')).toBe('2026');
  });
});

describe('nightsBetween', () => {
  it('compte les nuits entre deux dates', () => {
    expect(nightsBetween('2026-06-14', '2026-06-17')).toBe(3);
  });

  it('ne retourne jamais de valeur négative', () => {
    expect(nightsBetween('2026-06-17', '2026-06-14')).toBe(0);
  });

  it('retourne 0 si une borne manque', () => {
    expect(nightsBetween(null, '2026-06-17')).toBe(0);
    expect(nightsBetween('2026-06-14', null)).toBe(0);
  });
});
