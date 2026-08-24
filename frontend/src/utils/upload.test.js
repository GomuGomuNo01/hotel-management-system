import { describe, expect, it } from 'vitest';
import { filterOversized, formatFileSize, MAX_ADMIN_DOC_MB } from './upload';

const MB = 1024 * 1024;

/** Faux fichier — seuls `name` et `size` sont lus par le filtre. */
const file = (name, sizeMb) => ({ name, size: Math.round(sizeMb * MB) });

describe('formatFileSize', () => {
  it('formate en Mo à la française', () => {
    expect(formatFileSize(8.25 * MB)).toBe('8,3 Mo');
    expect(formatFileSize(5 * MB)).toBe('5 Mo');
  });

  it('tolère une taille absente', () => {
    expect(formatFileSize(undefined)).toBe('0 Mo');
  });
});

describe('filterOversized', () => {
  it('accepte tout quand les fichiers sont sous la limite', () => {
    const files = [file('a.pdf', 1), file('b.png', 4.9)];
    const { accepted, rejected, error } = filterOversized(files, MAX_ADMIN_DOC_MB);

    expect(accepted).toHaveLength(2);
    expect(rejected).toHaveLength(0);
    expect(error).toBeNull();
  });

  it('accepte un fichier exactement à la limite', () => {
    const { accepted, error } = filterOversized([file('pile.pdf', 5)], 5);

    expect(accepted).toHaveLength(1);
    expect(error).toBeNull();
  });

  it('nomme le fichier refusé et sa taille', () => {
    const { accepted, rejected, error } = filterOversized([file('PASSEPORT.pdf', 8.2)], 5);

    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(error).toBe('« PASSEPORT.pdf » (8,2 Mo) dépasse la limite de 5 Mo par fichier.');
  });

  it('ne retient que les fichiers valides d\'une sélection mixte', () => {
    const files = [file('ok.pdf', 2), file('trop-lourd.png', 9), file('ok2.webp', 1)];
    const { accepted, error } = filterOversized(files, 5);

    expect(accepted.map((f) => f.name)).toEqual(['ok.pdf', 'ok2.webp']);
    expect(error).toContain('trop-lourd.png');
  });

  it('résume au-delà de trois fichiers refusés', () => {
    const files = ['a', 'b', 'c', 'd', 'e'].map((n) => file(`${n}.pdf`, 9));
    const { error } = filterOversized(files, 5);

    expect(error).toBe('5 fichiers dépassent la limite de 5 Mo : a.pdf, b.pdf, c.pdf, +2 autres.');
  });

  it('tolère une sélection vide ou nulle', () => {
    expect(filterOversized(null, 5)).toEqual({ accepted: [], rejected: [], error: null });
    expect(filterOversized([], 5).error).toBeNull();
  });
});
