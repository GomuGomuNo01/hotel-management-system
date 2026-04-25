import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, token, role, login, logout, updateUser } = useAuthStore();
  return {
    user,
    token,
    role,
    isAuthenticated: !!token,
    isClient: role === 'client',
    isAdmin: role === 'admin',
    isOwner: role === 'owner',
    login,
    logout,
    updateUser,
  };
};
