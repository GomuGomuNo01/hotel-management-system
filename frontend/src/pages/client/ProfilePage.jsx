import { useAuth } from '../../hooks/useAuth';
import { Mail, Phone, User } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>
      <div className="card card-pad space-y-3 text-sm">
        <div className="flex items-center gap-3"><User className="h-4 w-4 text-gray-400" /> {user?.first_name} {user?.last_name}</div>
        <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-gray-400" /> {user?.email}</div>
        <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-gray-400" /> {user?.phone || '—'}</div>
      </div>
    </div>
  );
}
