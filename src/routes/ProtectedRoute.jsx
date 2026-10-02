import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { session, normalizeRole, hasRole } from '../services/apiService';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const user = session.getUser();

  if (!user || !session.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(user, allowedRoles)) {
    const userRole = normalizeRole(user.role);
    const homeForRole =
      userRole === 'admin'
        ? '/admin'
        : userRole === 'kitchen'
          ? '/kitchen'
          : userRole === 'delivery'
            ? '/delivery'
            : '/dashboard';

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-card border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-red-500/10">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Restricted Access</h2>
          <p className="text-sm text-text-muted mb-6">
            Your account ({user.email}) has the role <span className="font-bold text-primary uppercase">{user.role}</span> which does not have permission to view this section.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={homeForRole}
              className="btn-primary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-2 rounded-xl"
            >
              Go to Your Portal
            </a>
            <a
              href="/"
              className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-xs font-bold text-text-muted hover:text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Store
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
