import { describe, it, expect } from 'vitest';
import { overlapsUnavailable, reservationTotal, amountDueNow, nightsCount } from './booking';

describe('overlapsUnavailable', () => {
  const periods = [{ check_in: '2026-07-10', check_out: '2026-07-15' }];

  it('détecte un chevauchement avec une période réservée', () => {
    expect(overlapsUnavailable('2026-07-12', '2026-07-18', periods)).toBe(true);
  });

  it('autorise un créneau adjacent (départ = arrivée existante)', () => {
    // Arrivée le 15 (jour du départ d'un autre) : pas de conflit.
    expect(overlapsUnavailable('2026-07-15', '2026-07-20', periods)).toBe(false);
    // Départ le 10 (jour d'arrivée d'un autre) : pas de conflit.
    expect(overlapsUnavailable('2026-07-05', '2026-07-10', periods)).toBe(false);
  });

  it('autorise un créneau totalement hors des périodes', () => {
    expect(overlapsUnavailable('2026-08-01', '2026-08-05', periods)).toBe(false);
  });

  it('retourne false si une borne ou la liste manque', () => {
    expect(overlapsUnavailable('', '2026-07-12', periods)).toBe(false);
    expect(overlapsUnavailable('2026-07-12', '', periods)).toBe(false);
    expect(overlapsUnavailable('2026-07-12', '2026-07-18', [])).toBe(false);
  });
});

describe('reservationTotal', () => {
  it('multiplie le prix par nuit par le nombre de nuits', () => {
    expect(reservationTotal(45000, 3)).toBe(135000);
  });

  it('renvoie 0 si prix ou nuits manquent', () => {
    expect(reservationTotal(undefined, 3)).toBe(0);
    expect(reservationTotal(45000, 0)).toBe(0);
    expect(reservationTotal(null, null)).toBe(0);
  });
});

describe('amountDueNow', () => {
  it('demande 50 % en plan partiel (acompte)', () => {
    expect(amountDueNow(135000, 'partial')).toBe(67500);
  });

  it('demande 100 % en plan intégral', () => {
    expect(amountDueNow(135000, 'full')).toBe(135000);
  });

  it('demande 100 % par défaut pour tout autre plan', () => {
    expect(amountDueNow(135000, undefined)).toBe(135000);
  });
});

describe('nightsCount', () => {
  it('compte les nuits entre deux dates', () => {
    expect(nightsCount('2026-07-10', '2026-07-13')).toBe(3);
  });
});
