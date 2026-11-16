import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";

export function ProtectedRoute({ adminOnly = false, roles }: { adminOnly?: boolean; roles?: AppRole[] }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (adminOnly && role !== "admin") return <Navigate to="/my-profile" replace />;
  if (roles && !roles.includes(role)) {
    const dest = role === "admin" ? "/dashboard" : role === "teacher" ? "/schedule" : "/my-profile";
    return <Navigate to={dest} replace />;
  }
  return <Outlet />;
}

export function RoleRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Landing />;
  const dest = role === "admin" ? "/dashboard" : role === "teacher" ? "/schedule" : "/my-profile";
  return <Navigate to={dest} replace />;
}
