import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, token, role, remember, login, logout, updateUser } = useAuthStore();
  return {
    user,
    token,
    role,
    remember,
    isAuthenticated: !!token,
    isClient: role === 'client',
    isAdmin: role === 'admin',
    isOwner: role === 'owner',
    login,
    logout,
    updateUser,
  };
};
