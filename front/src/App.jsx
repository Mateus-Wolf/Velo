import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import MetricsDashboardPage from './pages/MetricsDashboardPage';
import FinancialPage from './pages/FinancialPage';
import WorkplacePage from './pages/WorkplacePage';
import ClientHistoryPage from './pages/ClientHistoryPage';
import WorkplaceHistoryPage from './pages/WorkplaceHistoryPage';
import UserHistoryPage from './pages/UserHistoryPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AdminRoute } from './components/ProtectedRoute';
import NotificationToast from './components/NotificationToast';
import ConfirmationPage from './pages/ConfirmationPage';
import CancellationPage from './pages/CancellationPage';
import ReviewPage from './pages/ReviewPage';
import GlobalLoading from './components/GlobalLoading';
import GeminiChatbot from './components/GeminiChatbot';
import PendingAppointmentsPage from './pages/PendingAppointmentsPage';
import TeamPage from './pages/TeamPage';

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

function AnimatedPage({ children }) {
  return (
    <motion.div {...pageTransition}>
      {children}
    </motion.div>
  );
}

import { useEffect } from 'react';

export default function App() {
  const location = useLocation();

  useEffect(() => {
    const theme = localStorage.getItem('velo_theme') || 'light';
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, []);

  return (
    <>
      <Toaster 
        position="top-center" 
        toastOptions={{
          className: '!bg-surface-900 !text-white !border !border-white/10 !rounded-xl',
          style: {
            background: '#18181b', // Corresponde a surface-900 ou próximo
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }} 
      />
      <NotificationToast />
      <GlobalLoading />
      <GeminiChatbot />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              <AnimatedPage>
                <LoginPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <AnimatedPage>
                <ForgotPasswordPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/confirmacao"
            element={
              <AnimatedPage>
                <ConfirmationPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/cancelamento"
            element={
              <AnimatedPage>
                <CancellationPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/avaliar"
            element={
              <AnimatedPage>
                <ReviewPage />
              </AnimatedPage>
            }
          />
          {/* Calendar / Agenda is the main home page */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AnimatedPage>
                  <CalendarPage />
                </AnimatedPage>
              </ProtectedRoute>
            }
          />
          {/* Workplaces listing — visible but read-only for staff */}
          <Route
            path="/workplaces"
            element={
              <ProtectedRoute>
                <AnimatedPage>
                  <DashboardPage />
                </AnimatedPage>
              </ProtectedRoute>
            }
          />
          {/* Metrics Dashboard — admin only */}
          <Route
            path="/dashboard"
            element={
              <AdminRoute>
                <AnimatedPage>
                  <MetricsDashboardPage />
                </AnimatedPage>
              </AdminRoute>
            }
          />
          {/* Financial — admin only */}
          <Route
            path="/financeiro"
            element={
              <AdminRoute>
                <AnimatedPage>
                  <FinancialPage />
                </AnimatedPage>
              </AdminRoute>
            }
          />
          {/* Workplace clients */}
          <Route
            path="/workplace/:workplaceId"
            element={
              <ProtectedRoute>
                <AnimatedPage>
                  <WorkplacePage />
                </AnimatedPage>
              </ProtectedRoute>
            }
          />
          {/* History — by client */}
          <Route
            path="/client/:clientId/history"
            element={
              <ProtectedRoute>
                <AnimatedPage>
                  <ClientHistoryPage />
                </AnimatedPage>
              </ProtectedRoute>
            }
          />
          {/* History — by workplace */}
          <Route
            path="/workplace/:workplaceId/history"
            element={
              <ProtectedRoute>
                <AnimatedPage>
                  <WorkplaceHistoryPage />
                </AnimatedPage>
              </ProtectedRoute>
            }
          />
          {/* History — user (all) */}
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <AnimatedPage>
                  <UserHistoryPage />
                </AnimatedPage>
              </ProtectedRoute>
            }
          />
          {/* Pending Appointments — admin only */}
          <Route
            path="/pendentes"
            element={
              <AdminRoute>
                <AnimatedPage>
                  <PendingAppointmentsPage />
                </AnimatedPage>
              </AdminRoute>
            }
          />
          {/* Profile — accessible by all but staff sees read-only */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AnimatedPage>
                  <ProfilePage />
                </AnimatedPage>
              </ProtectedRoute>
            }
          />
          {/* Team Management — admin only */}
          <Route
            path="/equipe"
            element={
              <AdminRoute>
                <AnimatedPage>
                  <TeamPage />
                </AnimatedPage>
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
