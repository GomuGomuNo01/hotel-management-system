import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('affiche le libellé associé à un statut connu', () => {
    render(<StatusBadge status="confirmed" />);
    expect(screen.getByText('Confirmée')).toBeInTheDocument();
  });

  it('applique les classes de couleur du statut', () => {
    render(<StatusBadge status="cancelled" />);
    const badge = screen.getByText('Annulée');
    expect(badge.className).toContain('bg-red-100');
  });

  it('affiche le statut brut en repli quand il est inconnu', () => {
    render(<StatusBadge status="inconnu" />);
    expect(screen.getByText('inconnu')).toBeInTheDocument();
  });
});
