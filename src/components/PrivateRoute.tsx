import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export default function PrivateRoute({ allow }: { allow?: Role[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) {
    // Redirige vers son propre espace si le rôle ne correspond pas
    return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  }
  return <Outlet />;
}
