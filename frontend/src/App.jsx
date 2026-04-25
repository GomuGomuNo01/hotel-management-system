import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import OwnerLayout from './layouts/OwnerLayout';

import ClientGuard from './guards/ClientGuard';
import AdminGuard from './guards/AdminGuard';
import OwnerGuard from './guards/OwnerGuard';

import HomePage from './pages/public/HomePage';
import RoomsPage from './pages/public/RoomsPage';
import RoomDetailPage from './pages/public/RoomDetailPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import NotFoundPage from './pages/public/NotFoundPage';

import ClientDashboard from './pages/client/DashboardPage';
import ClientReservations from './pages/client/ReservationsPage';
import NewReservationPage from './pages/client/NewReservationPage';
import PaymentPage from './pages/client/PaymentPage';
import ProfilePage from './pages/client/ProfilePage';

import AdminDashboard from './pages/admin/AdminDashboardPage';
import AdminRooms from './pages/admin/RoomsPage';
import AdminReservations from './pages/admin/ReservationsPage';
import AdminClients from './pages/admin/ClientsPage';
import AdminClientDetail from './pages/admin/ClientDetailPage';
import CheckInOut from './pages/admin/CheckInOutPage';

import OwnerDashboard from './pages/owner/OwnerDashboardPage';
import AdminsPage from './pages/owner/AdminsPage';
import AdminFormPage from './pages/owner/AdminFormPage';
import AuditLogsPage from './pages/owner/AuditLogsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:id" element={<RoomDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* CLIENT */}
        <Route element={<ClientGuard><PublicLayout /></ClientGuard>}>
          <Route path="/mon-espace" element={<ClientDashboard />} />
          <Route path="/mon-espace/reservations" element={<ClientReservations />} />
          <Route path="/mon-espace/reservations/new" element={<NewReservationPage />} />
          <Route path="/mon-espace/paiement/:id" element={<PaymentPage />} />
          <Route path="/mon-espace/profil" element={<ProfilePage />} />
        </Route>

        {/* ADMIN */}
        <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/rooms" element={<AdminRooms />} />
          <Route path="/admin/reservations" element={<AdminReservations />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/clients/:id" element={<AdminClientDetail />} />
          <Route path="/admin/checkin-checkout" element={<CheckInOut />} />
        </Route>

        {/* OWNER */}
        <Route element={<OwnerGuard><OwnerLayout /></OwnerGuard>}>
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/admins" element={<AdminsPage />} />
          <Route path="/owner/admins/new" element={<AdminFormPage />} />
          <Route path="/owner/admins/:id" element={<AdminFormPage />} />
          <Route path="/owner/audit" element={<AuditLogsPage />} />
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
