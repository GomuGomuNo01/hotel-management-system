import { describe, it, expect } from 'vitest';
import { getStatusConfig, STATUS_CONFIG } from './getStatusColor';

describe('getStatusConfig', () => {
  it('retourne la configuration connue pour un statut valide', () => {
    expect(getStatusConfig('confirmed')).toBe(STATUS_CONFIG.confirmed);
    expect(getStatusConfig('confirmed').label).toBe('Confirmée');
  });

  it('produit un repli lisible pour un statut inconnu', () => {
    const fallback = getStatusConfig('zzz');
    expect(fallback.label).toBe('zzz');
    expect(fallback.color).toContain('bg-gray-50');
  });

  it('produit un repli avec tiret quand le statut est vide', () => {
    expect(getStatusConfig(undefined).label).toBe('-');
  });
});
