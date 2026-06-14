import { lazy, Suspense }                from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthInit }                   from './hooks/useAuthInit';
import { useAuth }                       from './hooks/useAuth';

import PublicLayout   from './layouts/PublicLayout';
import AuthLayout     from './layouts/AuthLayout';
import AdminLayout    from './layouts/AdminLayout';
import OwnerLayout    from './layouts/OwnerLayout';
import PdfViewerDrawer from './components/common/PdfViewerDrawer';
import ClientGuard    from './guards/ClientGuard';
import AdminGuard     from './guards/AdminGuard';
import OwnerGuard     from './guards/OwnerGuard';
import PermissionGuard from './guards/PermissionGuard';

/* ── Spinner de chargement léger ────────────────────────────── */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  );
}

/* ── Pages PUBLIC (lazy) ─────────────────────────────────────── */
const HomePage         = lazy(() => import('./pages/public/HomePage'));
const RoomsPage        = lazy(() => import('./pages/public/RoomsPage'));
const RoomDetailPage   = lazy(() => import('./pages/public/RoomDetailPage'));
const LoginPage        = lazy(() => import('./pages/public/LoginPage'));
const RegisterPage     = lazy(() => import('./pages/public/RegisterPage'));
const NotFoundPage     = lazy(() => import('./pages/public/NotFoundPage'));
const ServerErrorPage  = lazy(() => import('./pages/public/ServerErrorPage'));
const GoogleCallbackPage = lazy(() => import('./pages/public/GoogleCallbackPage'));
const VerifyEmailPage  = lazy(() => import('./pages/public/VerifyEmailPage'));
const EmailVerifiedPage = lazy(() => import('./pages/public/EmailVerifiedPage'));
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/public/ResetPasswordPage'));

/* ── Pages CLIENT (lazy) ─────────────────────────────────────── */
const DashboardPage      = lazy(() => import('./pages/client/DashboardPage'));
const ReservationsPage   = lazy(() => import('./pages/client/ReservationsPage'));
const NewReservationPage = lazy(() => import('./pages/client/NewReservationPage'));
const PaymentPage        = lazy(() => import('./pages/client/PaymentPage'));
const ProfilePage        = lazy(() => import('./pages/client/ProfilePage'));
const DocumentsPage      = lazy(() => import('./pages/client/DocumentsPage'));
const ReviewsPage        = lazy(() => import('./pages/client/ReviewsPage'));
const SupportPage        = lazy(() => import('./pages/client/SupportPage'));

/* ── Pages ADMIN (lazy) ──────────────────────────────────────── */
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminRooms         = lazy(() => import('./pages/admin/RoomsPage'));
const AdminReservations  = lazy(() => import('./pages/admin/ReservationsPage'));
const AdminPlanning      = lazy(() => import('./pages/admin/PlanningPage'));
const AdminHousekeeping  = lazy(() => import('./pages/admin/HousekeepingPage'));
const AdminClients       = lazy(() => import('./pages/admin/ClientsPage'));
const AdminClientDetail  = lazy(() => import('./pages/admin/ClientDetailPage'));
const CheckInOut         = lazy(() => import('./pages/admin/CheckInOutPage'));
const AdminProfile       = lazy(() => import('./pages/admin/AdminProfilePage'));
const AdminRefunds       = lazy(() => import('./pages/admin/RefundsPage'));
const AdminComplaints    = lazy(() => import('./pages/admin/ComplaintsPage'));
const AdminReports       = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminAuditSummary  = lazy(() => import('./pages/admin/AdminAuditSummaryPage'));
const AdminReviewsPage   = lazy(() => import('./pages/admin/AdminReviewsPage'));

/* ── Pages OWNER (lazy) ──────────────────────────────────────── */
const OwnerDashboard        = lazy(() => import('./pages/owner/OwnerDashboardPage'));
const AdminsPage            = lazy(() => import('./pages/owner/AdminsPage'));
const AdminFormPage         = lazy(() => import('./pages/owner/AdminFormPage'));
const AuditLogsPage         = lazy(() => import('./pages/owner/AuditLogsPage'));
const OwnerReviewsPage      = lazy(() => import('./pages/owner/OwnerReviewsPage'));
const OwnerReservationsPage = lazy(() => import('./pages/owner/OwnerReservationsPage'));
const OwnerRefundsPage      = lazy(() => import('./pages/owner/OwnerRefundsPage'));
const OwnerComplaintsPage   = lazy(() => import('./pages/owner/OwnerComplaintsPage'));
const OwnerRoomsPage        = lazy(() => import('./pages/owner/OwnerRoomsPage'));
const OwnerClientsPage      = lazy(() => import('./pages/owner/OwnerClientsPage'));
const OwnerProfilePage      = lazy(() => import('./pages/owner/OwnerProfilePage'));

/* ─────────────────────────────────────────────────────────────── */

/* Site public : les membres du staff (admin/owner) sont redirigés vers leur
   espace et ne peuvent pas accéder à l'accueil ni au catalogue de chambres. */
function PublicSiteLayout() {
  const { isAdmin, isOwner } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isOwner) return <Navigate to="/owner" replace />;
  return <PublicLayout />;
}

export default function App() {
  useAuthInit();

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── PUBLIC (avec footer) - staff redirigé vers son espace ── */}
          <Route element={<PublicSiteLayout />}>
            <Route path="/"                  element={<HomePage />} />
            <Route path="/rooms"             element={<RoomsPage />} />
            <Route path="/rooms/:id"         element={<RoomDetailPage />} />
          </Route>

          {/* ── AUTH (sans footer) ── */}
          <Route element={<AuthLayout />}>
            <Route path="/login"             element={<LoginPage />} />
            <Route path="/register"          element={<RegisterPage />} />
            <Route path="/verifier-email"    element={<VerifyEmailPage />} />
            <Route path="/email-verifie"     element={<EmailVerifiedPage />} />
            <Route path="/mot-de-passe-oublie"        element={<ForgotPasswordPage />} />
            <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
          </Route>

          {/* Google OAuth callback - sans layout */}
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

          {/* ── CLIENT ── */}
          <Route element={<ClientGuard><PublicLayout /></ClientGuard>}>
            <Route path="/mon-espace"                    element={<DashboardPage />} />
            <Route path="/mon-espace/reservations"       element={<ReservationsPage />} />
            <Route path="/mon-espace/reservations/new"   element={<NewReservationPage />} />
            <Route path="/mon-espace/paiement/:id"       element={<PaymentPage />} />
            <Route path="/mon-espace/profil"             element={<ProfilePage />} />
            <Route path="/mon-espace/documents"          element={<DocumentsPage />} />
            <Route path="/mon-espace/avis"               element={<ReviewsPage />} />
            <Route path="/mon-espace/support"            element={<SupportPage />} />
          </Route>

          {/* ── ADMIN ── */}
          <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/rooms" element={
              <PermissionGuard permission="manage_rooms"><AdminRooms /></PermissionGuard>
            } />
            <Route path="/admin/reservations" element={
              <PermissionGuard permission="manage_reservations"><AdminReservations /></PermissionGuard>
            } />
            <Route path="/admin/planning" element={
              <PermissionGuard permission="manage_reservations"><AdminPlanning /></PermissionGuard>
            } />
            <Route path="/admin/housekeeping" element={
              <PermissionGuard permission="manage_housekeeping"><AdminHousekeeping /></PermissionGuard>
            } />
            <Route path="/admin/clients" element={
              <PermissionGuard permission="manage_clients"><AdminClients /></PermissionGuard>
            } />
            <Route path="/admin/clients/:id" element={
              <PermissionGuard permission="manage_clients"><AdminClientDetail /></PermissionGuard>
            } />
            <Route path="/admin/checkin-checkout" element={
              <PermissionGuard permission="manage_checkin_checkout"><CheckInOut /></PermissionGuard>
            } />
            <Route path="/admin/remboursements" element={
              <PermissionGuard permission="manage_payments"><AdminRefunds /></PermissionGuard>
            } />
            <Route path="/admin/reclamations" element={
              <PermissionGuard permission="manage_complaints"><AdminComplaints /></PermissionGuard>
            } />
            <Route path="/admin/rapports" element={
              <PermissionGuard permission="view_reports"><AdminReports /></PermissionGuard>
            } />
            <Route path="/admin/audit-summary" element={
              <PermissionGuard permission="view_audit_summary"><AdminAuditSummary /></PermissionGuard>
            } />
            <Route path="/admin/avis" element={
              <PermissionGuard permission="view_reviews"><AdminReviewsPage /></PermissionGuard>
            } />
            <Route path="/admin/profil" element={<AdminProfile />} />
          </Route>

          {/* ── OWNER ── */}
          <Route element={<OwnerGuard><OwnerLayout /></OwnerGuard>}>
            <Route path="/owner"                    element={<OwnerDashboard />} />
            <Route path="/owner/admins"             element={<AdminsPage />} />
            <Route path="/owner/admins/new"         element={<AdminFormPage />} />
            <Route path="/owner/admins/:id"         element={<AdminFormPage />} />
            <Route path="/owner/reservations"       element={<OwnerReservationsPage />} />
            <Route path="/owner/remboursements"     element={<OwnerRefundsPage />} />
            <Route path="/owner/reclamations"       element={<OwnerComplaintsPage />} />
            <Route path="/owner/rooms"              element={<OwnerRoomsPage />} />
            <Route path="/owner/clients"            element={<OwnerClientsPage />} />
            <Route path="/owner/audit"              element={<AuditLogsPage />} />
            <Route path="/owner/avis"               element={<OwnerReviewsPage />} />
            <Route path="/owner/profil"             element={<OwnerProfilePage />} />
          </Route>

          <Route path="/404"    element={<NotFoundPage />} />
          <Route path="/erreur" element={<ServerErrorPage />} />
          <Route path="*"       element={<Navigate to="/404" replace />} />

        </Routes>
      </Suspense>

      {/* Lecteur PDF latéral global (reçus / factures) */}
      <PdfViewerDrawer />
    </BrowserRouter>
  );
}
