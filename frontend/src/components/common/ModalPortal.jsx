import { createPortal } from 'react-dom';

/**
 * ModalPortal - rend ses enfants directement dans <body>.
 *
 * Garantit qu'un overlay `fixed inset-0` couvre TOUT le viewport (header
 * inclus), indépendamment de tout contexte d'empilement (transform, z-index,
 * overflow…) créé par un composant parent. Pattern standard pour les modals.
 */
export default function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
