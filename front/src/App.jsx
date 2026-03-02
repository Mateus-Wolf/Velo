import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import MetricsDashboardPage from './pages/MetricsDashboardPage';
import WorkplacePage from './pages/WorkplacePage';
import ClientHistoryPage from './pages/ClientHistoryPage';
import WorkplaceHistoryPage from './pages/WorkplaceHistoryPage';
import UserHistoryPage from './pages/UserHistoryPage';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationToast from './components/NotificationToast';
import ConfirmationPage from './pages/ConfirmationPage';
import CancellationPage from './pages/CancellationPage';
import GlobalLoading from './components/GlobalLoading';
import GeminiChatbot from './components/GeminiChatbot';

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
    const theme = localStorage.getItem('velo_theme') || 'dark';
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, []);

  return (
    <>
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
          {/* Workplaces listing */}
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
          {/* Metrics Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AnimatedPage>
                  <MetricsDashboardPage />
                </AnimatedPage>
              </ProtectedRoute>
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
          {/* Profile */}
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
