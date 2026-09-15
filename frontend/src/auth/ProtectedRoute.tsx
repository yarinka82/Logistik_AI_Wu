
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { toast } from "../components/Notifier";
import type { Role } from "./types";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) return <div>Lädt...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    toast.error(t("auth.accessDenied", "У вас немає доступу до цієї сторінки"));
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}