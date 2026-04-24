import { Navigate, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useRole } from './use-auth';
import type { UserRole } from '@/types/enums';

interface Props {
  roles: readonly UserRole[];
  children?: ReactNode;
}

export function RoleGuard({ roles, children }: Props) {
  const role = useRole();
  if (!role) return <Navigate to="/signin" replace />;
  if (!roles.includes(role)) return <Navigate to="/unauthorized" replace />;
  return children ? <>{children}</> : <Outlet />;
}
