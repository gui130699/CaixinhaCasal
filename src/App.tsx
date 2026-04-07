import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/providers/auth.provider'
import { ProtectedRoute } from '@/components/layout/protected-route'
import { AppLayout } from '@/components/layout/app-layout'

// Auth pages
import LoginPage from '@/pages/auth/login'
import RegisterPage from '@/pages/auth/register'
import FamilySetupPage from '@/pages/auth/family-setup'
import ForgotPasswordPage from '@/pages/auth/forgot-password'
import ResetPasswordPage from '@/pages/auth/reset-password'

// App pages
import DashboardPage from '@/pages/dashboard'
import GoalsPage from '@/pages/goals'
import GoalDetailPage from '@/pages/goals/detail'
import BankingPage from '@/pages/banking'
import BankingDetailPage from '@/pages/banking/detail'
import InstallmentsPage from '@/pages/installments'
import TransactionsPage from '@/pages/transactions'
import InterestPage from '@/pages/interest'
import ReportsPage from '@/pages/reports'
import ProfilePage from '@/pages/profile'
import SettingsPage from '@/pages/settings'

// Admin pages
import AdminPage from '@/pages/admin'
import AdminFamiliesPage from '@/pages/admin/families'
import AdminUsersPage from '@/pages/admin/users'
import AdminAuditPage from '@/pages/admin/audit'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/family-setup" element={<FamilySetupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="goals/:id" element={<GoalDetailPage />} />
            <Route path="banking" element={<BankingPage />} />
            <Route path="banking/:id" element={<BankingDetailPage />} />
            <Route path="installments" element={<InstallmentsPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="interest" element={<InterestPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Admin-only routes */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="admin" element={<AdminPage />} />
              <Route path="admin/families" element={<AdminFamiliesPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/audit" element={<AdminAuditPage />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
