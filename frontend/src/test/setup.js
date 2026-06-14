import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Démonte l'arbre React rendu après chaque test pour éviter les fuites entre cas.
afterEach(() => {
  cleanup();
});
