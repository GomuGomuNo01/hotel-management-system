import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary — capture les erreurs de rendu React et affiche un écran de
 * secours au lieu d'une page blanche. Indispensable : sans elle, la moindre
 * exception dans un composant (ex. variable non définie) « casse » toute l'app.
 *
 * Doit être un composant de classe (seuls componentDidCatch /
 * getDerivedStateFromError captent les erreurs de rendu).
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Trace en console pour le diagnostic (et point de branchement futur vers
    // un service de monitoring type Sentry).
    console.error('ErrorBoundary a capté une erreur :', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env?.DEV;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="mt-5 text-lg font-bold text-slate-900">Une erreur inattendue est survenue</h1>
          <p className="mt-2 text-sm text-slate-500">
            L'application a rencontré un problème d'affichage. Vous pouvez recharger
            la page ; si le problème persiste, revenez à l'accueil.
          </p>

          {isDev && this.state.error && (
            <pre className="mt-4 text-left text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto max-h-40">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={this.handleReload} className="btn-primary">
              <RefreshCw className="h-4 w-4" /> Recharger
            </button>
            <button onClick={this.handleHome} className="btn-secondary">
              <Home className="h-4 w-4" /> Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
}
