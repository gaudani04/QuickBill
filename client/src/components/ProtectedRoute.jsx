import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. Show loader while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  // 2. Only redirect when we are sure user is NOT logged in
  if (!loading && user === null) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // 3. Role-based access control
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // 4. Allow access
  return <Outlet />;
}