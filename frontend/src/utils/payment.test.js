import { describe, it, expect, vi, afterEach } from 'vitest';
import { paymentTypeLabel, secondsLeft } from './payment';

describe('paymentTypeLabel', () => {
  it('libelle chaque type connu', () => {
    expect(paymentTypeLabel('deposit')).toBe('Acompte (50 %)');
    expect(paymentTypeLabel('balance')).toBe('Solde restant');
    expect(paymentTypeLabel('full')).toBe('Paiement intégral');
  });

  it('retombe sur « Paiement » pour un type inconnu', () => {
    expect(paymentTypeLabel('xyz')).toBe('Paiement');
    expect(paymentTypeLabel(undefined)).toBe('Paiement');
  });
});

describe('secondsLeft', () => {
  afterEach(() => vi.useRealTimers());

  it('retourne null sans date d\'expiration', () => {
    expect(secondsLeft(null)).toBeNull();
  });

  it('calcule les secondes restantes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'));
    // Expiration dans 90 s.
    expect(secondsLeft('2026-07-10T12:01:30Z')).toBe(90);
  });

  it('ne descend jamais sous zéro (déjà expiré)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'));
    expect(secondsLeft('2026-07-10T11:59:00Z')).toBe(0);
  });
});
