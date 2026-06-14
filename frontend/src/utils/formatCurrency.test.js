import { describe, it, expect } from 'vitest';
import { formatXOF } from './formatCurrency';

describe('formatXOF', () => {
  it('formate un entier avec le séparateur de milliers et le libellé F CFA', () => {
    // Espace insécable étroit (U+202F) inséré par le locale fr-FR.
    expect(formatXOF(5450500)).toBe('5 450 500 F CFA');
  });

  it('arrondit les décimales (monnaie entière)', () => {
    expect(formatXOF(24999.6)).toBe('25 000 F CFA');
  });

  it('traite null et undefined comme zéro', () => {
    expect(formatXOF(null)).toBe('0 F CFA');
    expect(formatXOF(undefined)).toBe('0 F CFA');
  });

  it('gère zéro', () => {
    expect(formatXOF(0)).toBe('0 F CFA');
  });
});
