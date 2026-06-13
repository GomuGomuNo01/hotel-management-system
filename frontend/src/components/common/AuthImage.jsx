/**
 * AuthImage — affiche une image servie par un endpoint authentifié.
 *
 * Les pièces d'identité sont stockées sur un disque privé : elles ne sont plus
 * accessibles par URL directe. On récupère donc le fichier en blob via
 * `loader` (fonction renvoyant une Promise<Blob>), puis on crée une object URL
 * locale révoquée au démontage.
 */
import { useEffect, useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';

export default function AuthImage({ loader, alt = '', className = '' }) {
  const [src, setSrc] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    setState('loading');
    Promise.resolve()
      .then(loader)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'error') {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
        <ImageOff className="h-4 w-4" /> Aperçu indisponible
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-10 text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
