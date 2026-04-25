export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} {import.meta.env.VITE_APP_NAME || 'Hotel Management'} — Tous droits réservés.
      </div>
    </footer>
  );
}
