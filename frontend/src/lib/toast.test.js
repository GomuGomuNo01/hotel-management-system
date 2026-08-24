import { describe, expect, it } from 'vitest';
import { readingTime } from './toast';

describe('readingTime', () => {
  it('laisse un message court au plancher de lisibilité', () => {
    // 2 mots ≈ 2,1 s de lecture : trop bref pour être remarqué.
    expect(readingTime('Chambre créée.', 'success')).toBe(4000);
  });

  it('allonge la durée pour un message long', () => {
    const message = 'Le compte de Diallo Mamadou a été créé. '
                  + 'Les identifiants de connexion ont été envoyés par e-mail.';

    const duration = readingTime(message, 'success');

    expect(duration).toBeGreaterThan(6000);
    expect(duration).toBeLessThanOrEqual(10000);
  });

  it('croît avec le nombre de mots', () => {
    const court = readingTime('Profil mis à jour, tout est enregistré correctement.', 'success');
    const long  = readingTime(
      'Profil mis à jour, tout est enregistré correctement, '
      + 'et vos préférences de notification ont également été prises en compte.',
      'success',
    );

    expect(long).toBeGreaterThan(court);
  });

  it('accorde plus de temps aux erreurs qu\'aux confirmations', () => {
    const message = 'Une erreur est survenue.';

    expect(readingTime(message, 'error')).toBeGreaterThan(readingTime(message, 'success'));
  });

  it('plafonne les messages très longs', () => {
    const enorme = 'mot '.repeat(200);

    expect(readingTime(enorme, 'success')).toBe(10000);
    expect(readingTime(enorme, 'error')).toBe(12000);
  });

  it('retombe sur le plancher pour un contenu non textuel', () => {
    // toast.custom() reçoit du JSX : pas de mots à compter.
    expect(readingTime({ type: 'div' }, 'success')).toBe(4000);
    expect(readingTime(undefined, 'error')).toBe(6000);
  });
});
