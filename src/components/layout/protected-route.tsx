import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { PageLoading } from '@/components/ui/empty-state'

interface ProtectedRouteProps {
  requireAdmin?: boolean
  requireFamilyAdmin?: boolean
}

export function ProtectedRoute({ requireAdmin, requireFamilyAdmin }: ProtectedRouteProps) {
  const { user, isInitialized, isLoading, isMasterAdmin, familyRole } = useAuthStore()
  const location = useLocation()

  if (!isInitialized || isLoading) {
    return <PageLoading />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isMasterAdmin) {
    return <Navigate to="/" replace />
  }

  if (requireFamilyAdmin && familyRole !== 'admin' && !isMasterAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
