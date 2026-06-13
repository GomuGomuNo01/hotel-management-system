/**
 * ttlCache - cache mémoire léger avec TTL par clé.
 *
 * Usage :
 *   import { ttlCache } from '../lib/ttlCache';
 *
 *   const hit = ttlCache.get('my-key');          // null si absent/expiré
 *   ttlCache.set('my-key', value, 30_000);        // expire dans 30 s
 *   ttlCache.delete('my-key');                    // invalidation manuelle
 *   ttlCache.clear();                             // vide tout (ex : déconnexion)
 *
 * Conçu pour les hooks React (useReservations, useRooms…) afin d'éviter
 * un round-trip API à chaque re-mount de composant.
 * La Map est module-level donc partagée entre tous les consumers.
 */

const _store = new Map(); // key → { value, exp }

export const ttlCache = {
  /** Retourne la valeur ou null si la clé est absente/expirée. */
  get(key) {
    const entry = _store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.exp) {
      _store.delete(key);
      return null;
    }
    return entry.value;
  },

  /**
   * Lecture non destructive pour le pattern stale-while-revalidate.
   * Retourne { value, fresh } même si l'entrée est périmée (fresh=false),
   * ou null si la clé n'existe pas. Permet d'afficher des données périmées
   * immédiatement (sans spinner) puis de revalider en arrière-plan.
   */
  peek(key) {
    const entry = _store.get(key);
    if (!entry) return null;
    return { value: entry.value, fresh: Date.now() <= entry.exp };
  },

  /** Stocke une valeur avec un TTL en millisecondes (défaut : 30 s). */
  set(key, value, ttlMs = 30_000) {
    _store.set(key, { value, exp: Date.now() + ttlMs });
  },

  /** Supprime une entrée précise (invalidation après mutation). */
  delete(key) {
    _store.delete(key);
  },

  /** Supprime toutes les entrées dont la clé commence par un préfixe. */
  invalidatePrefix(prefix) {
    for (const key of _store.keys()) {
      if (key.startsWith(prefix)) _store.delete(key);
    }
  },

  /** Vide le cache entier (utile à la déconnexion). */
  clear() {
    _store.clear();
  },
};
