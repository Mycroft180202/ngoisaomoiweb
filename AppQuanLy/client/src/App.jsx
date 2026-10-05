import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { UiVersionProvider } from './contexts/UiVersionContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import TaskBoard from './pages/Tasks/TaskBoard';
import TourList from './pages/Tours/TourList';
import ApprovalList from './pages/Approvals/ApprovalList';
import StaffList from './pages/Staff/StaffList';
import TicketList from './pages/Tickets/TicketList';
import Settings from './pages/Settings/Settings';
import StaffDashboard from './pages/Dashboard/StaffDashboard';
import ForceChangePassword from './components/UI/ForceChangePassword';
import AttendancePage from './pages/Attendance/AttendancePage';
import Announcements from './pages/Announcements/Announcements';
import CalendarPage from './pages/Calendar/CalendarPage';
import CustomerList from './pages/Customers/CustomerList';
import ChatPage from './pages/Chat/ChatPage';
import DocumentList from './pages/Documents/DocumentList';
import KPIDashboard from './pages/KPI/KPIDashboard';
import MarketingReport from './pages/Customers/MarketingReport';
import EmailRouting from './pages/EmailRouting/EmailRouting';
import TourOperations from './pages/Tours/TourOperations';
import PublicTourTracker from './pages/Tours/PublicTourTracker';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-primary)'
      }}>
        <div className="loading-spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.needsPasswordChange) {
    return <ForceChangePassword />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function DashboardOrRedirect() {
  const { user } = useAuth();
  const isDirector = user?.role === 'director';
  const isManager = user?.role?.includes('manager');
  if (isDirector || isManager) {
    return <Dashboard />;
  }
  return <StaffDashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/tour/:token" element={<PublicTourTracker />} />
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route element={
        <ProtectedRoute><MainLayout /></ProtectedRoute>
      }>
        <Route index element={<DashboardOrRedirect />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="tasks" element={<TaskBoard />} />
        <Route path="tours" element={<TourList />} />
        <Route path="tour-operations" element={<TourOperations />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="marketing-report" element={<MarketingReport />} />
        <Route path="documents" element={<DocumentList />} />
        <Route path="kpi" element={<KPIDashboard />} />
        <Route path="approvals" element={<ApprovalList />} />
        <Route path="staff" element={<StaffList />} />
        <Route path="tickets" element={<TicketList />} />
        <Route path="settings" element={<Settings />} />
        <Route path="email-routing" element={<EmailRouting />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Toaster } from 'react-hot-toast';

export default function App() {
  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');

  return (
    isElectron ? (
      <HashRouter>
        <AuthProvider>
          <UiVersionProvider>
            <ConfirmProvider>
              <AppRoutes />
              <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' } }} />
            </ConfirmProvider>
          </UiVersionProvider>
        </AuthProvider>
      </HashRouter>
    ) : (
      <BrowserRouter basename="/quanly">
        <AuthProvider>
          <UiVersionProvider>
            <ConfirmProvider>
              <AppRoutes />
              <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' } }} />
            </ConfirmProvider>
          </UiVersionProvider>
        </AuthProvider>
      </BrowserRouter>
    )
  );
}
