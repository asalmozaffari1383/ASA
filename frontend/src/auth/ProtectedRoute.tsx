import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { Spinner } from "../components/ui/Spinner";
import type { PermissionFlag } from "../types";

interface Props {
  children: ReactNode;
  permission?: PermissionFlag;
  ceoOnly?: boolean;
}

/** Gates a route on authentication and, optionally, a dynamic permission flag. */
export function ProtectedRoute({ children, permission, ceoOnly }: Props) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="در حال بارگذاری..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if ((permission && !can(permission)) || (ceoOnly && user.role !== "ceo")) {
    return (
      <div className="card mx-auto mt-16 max-w-md text-center">
        <p className="text-lg font-semibold text-red-600">دسترسی غیرمجاز</p>
        <p className="mt-2 text-sm text-slate-500">
          شما مجوز لازم برای مشاهده این بخش را ندارید.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
