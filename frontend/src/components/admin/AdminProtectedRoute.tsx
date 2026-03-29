import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearAdminToken, getAdminToken } from "@/lib/adminAuth";
import { apiGet } from "@/lib/api";

type SessionResponse = {
  ok: boolean;
  data: {
    role: string;
  };
};

export default function AdminProtectedRoute() {
  const location = useLocation();
  const token = getAdminToken();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      if (!token) {
        if (active) {
          setAuthorized(false);
          setChecking(false);
        }
        return;
      }

      try {
        await apiGet<SessionResponse>("/api/auth/session");
        if (!active) return;
        setAuthorized(true);
      } catch {
        clearAdminToken();
        if (!active) return;
        setAuthorized(false);
      } finally {
        if (active) setChecking(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [token]);

  if (checking) {
    return <div className="min-h-screen admin-shell" />;
  }

  if (!authorized) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
