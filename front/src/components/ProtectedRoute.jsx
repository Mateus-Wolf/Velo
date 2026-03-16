import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export default function ProtectedRoute({ children }) {
    const token = useAuthStore((s) => s.token);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

/**
 * AdminRoute — redireciona staff para / se tentar acessar rota restrita.
 */
export function AdminRoute({ children }) {
    const token = useAuthStore((s) => s.token);
    const user = useAuthStore((s) => s.user);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role === 'staff') {
        return <Navigate to="/" replace />;
    }

    return children;
}
