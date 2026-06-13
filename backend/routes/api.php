<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Client;
use App\Http\Controllers\Owner;
use App\Http\Controllers\Public\RoomController as PublicRoomController;
use App\Http\Controllers\Client\ReviewController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PUBLIC — No authentication required
|--------------------------------------------------------------------------
| Anyone (visitors, guests) can browse the room catalogue. Authentication
| is only enforced when they actually try to make a reservation.
*/
Route::prefix('rooms')->group(function () {
    Route::get('/',                        [PublicRoomController::class, 'index']);
    Route::get('/popular',                 [PublicRoomController::class, 'popular']);
    Route::get('/{id}',                    [PublicRoomController::class, 'show'])->whereNumber('id');
    Route::get('/{id}/reviews',            [PublicRoomController::class, 'roomReviews'])->whereNumber('id');
    Route::get('/{id}/unavailable-dates',  [PublicRoomController::class, 'unavailableDates'])->whereNumber('id');
});

// Avis publics (témoignages homepage) — hors prefix rooms
Route::get('/reviews/public', [PublicRoomController::class, 'publicReviews']);

/*
|--------------------------------------------------------------------------
| AUTH — Public endpoints, throttled
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
    Route::post('/register',       [AuthController::class, 'register']);
    Route::post('/login',          [AuthController::class, 'login']);
    Route::get('/google/redirect', [GoogleAuthController::class, 'redirect']);
    Route::get('/google/callback', [GoogleAuthController::class, 'callback']);
    Route::post('/email/resend',   [VerifyEmailController::class, 'resend']);
    Route::post('/password/forgot', [PasswordResetController::class, 'forgot']);
    Route::post('/password/reset',  [PasswordResetController::class, 'reset']);
});

// Vérification e-mail — lien cliqué depuis la boîte mail (URL signée, pas de throttle)
Route::get('/auth/email/verify/{id}/{hash}', [VerifyEmailController::class, 'verify'])
    ->middleware('signed')
    ->name('verification.verify')
    ->whereNumber('id');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me',      [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});

/*
|--------------------------------------------------------------------------
| PAYMENT WEBHOOKS — HMAC-protected, never browser-facing
|--------------------------------------------------------------------------
*/
Route::post('/webhooks/orange', [Client\PaymentController::class, 'webhookOrange'])
    ->middleware('webhook:orange');

Route::post('/webhooks/wave', [Client\PaymentController::class, 'webhookWave'])
    ->middleware('webhook:wave');

/*
|--------------------------------------------------------------------------
| CLIENT — Sanctum + role:client
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:client'])->group(function () {
    // Compteurs de bulles regroupés (1 requête)
    Route::get('/badges', [Client\BadgeController::class, 'index']);

    // Profile
    Route::get('/profile',            [Client\ProfileController::class, 'show']);
    Route::patch('/profile',          [Client\ProfileController::class, 'update']);
    Route::patch('/profile/password', [Client\ProfileController::class, 'updatePassword']);
    Route::post('/profile/photo',     [Client\ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo',   [Client\ProfileController::class, 'deletePhoto']);
    Route::post('/profile/documents',      [Client\ProfileController::class, 'uploadDocuments']);
    Route::get('/profile/documents/view',  [Client\ProfileController::class, 'viewDocument']);
    Route::delete('/profile/documents',    [Client\ProfileController::class, 'deleteDocument']);

    // Reservations
    Route::apiResource('/reservations', Client\ReservationController::class);
    Route::get('/reservations/{id}/receipt',  [Client\PaymentController::class, 'receipt'])->whereNumber('id');
    Route::get('/reservations/{id}/invoice',  [Client\PaymentController::class, 'reservationInvoice'])->whereNumber('id');
    Route::post('/reservations/{id}/review',  [ReviewController::class, 'store'])->whereNumber('id');

    // Reviews
    Route::get('/reviews/pending-count', [ReviewController::class, 'pendingCount']);
    Route::get('/reviews/reviewable',    [ReviewController::class, 'reviewable']);
    Route::get('/reviews/mine',          [ReviewController::class, 'mine']);

    // Réclamations (service client)
    Route::get('/complaints',                       [Client\ComplaintController::class, 'index']);
    Route::get('/complaints/pending-count',         [Client\ComplaintController::class, 'pendingCount']);
    Route::post('/reservations/{id}/complaints',    [Client\ComplaintController::class, 'store'])->whereNumber('id');
    Route::delete('/complaints/{id}',               [Client\ComplaintController::class, 'destroy'])->whereNumber('id');

    // Payments
    Route::post('/payments/initiate',      [Client\PaymentController::class, 'initiate']);
    Route::get('/payments/{id}/status',    [Client\PaymentController::class, 'status'])->whereNumber('id');
    Route::delete('/payments/{id}',        [Client\PaymentController::class, 'cancel'])->whereNumber('id');
    Route::post('/payments/{id}/simulate', [Client\PaymentController::class, 'simulate'])->whereNumber('id');
    Route::get('/payments/{id}/invoice',   [Client\PaymentController::class, 'invoice'])->whereNumber('id');

    // Remboursements (suivi + reçu)
    Route::get('/refunds',              [Client\RefundController::class, 'index']);
    Route::get('/refunds/{id}/receipt', [Client\RefundController::class, 'receipt'])->whereNumber('id');

    // Notifications internes
    Route::get('/notifications',                [Client\NotificationController::class, 'index']);
    Route::get('/notifications/unread-count',   [Client\NotificationController::class, 'unreadCount']);
    Route::post('/notifications/read-all',      [Client\NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read',     [Client\NotificationController::class, 'markRead']);
});

/*
|--------------------------------------------------------------------------
| ADMIN — Sanctum + role:admin
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    // Profile (no extra permission required — every admin can manage their own profile)
    Route::get('/profile',            [Admin\ProfileController::class, 'show']);
    Route::patch('/profile',          [Admin\ProfileController::class, 'update']);
    Route::patch('/profile/password', [Admin\ProfileController::class, 'updatePassword']);
    Route::post('/profile/photo',     [Admin\ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo',   [Admin\ProfileController::class, 'deletePhoto']);
    Route::get('/profile/id-document',     [Admin\ProfileController::class, 'idDocument']);

    // Dashboard
    Route::get('/dashboard/stats',   [Admin\DashboardController::class, 'stats']);
    Route::get('/dashboard/badges',  [Admin\DashboardController::class, 'badges']);

    // Rooms (CRUD)
    Route::apiResource('/rooms', Admin\RoomController::class)
        ->middleware('permission:manage_rooms');

    // Room images
    Route::delete('/rooms/{room}/images/{image}', [Admin\RoomController::class, 'deleteImage'])
        ->middleware('permission:manage_rooms')
        ->whereNumber(['room', 'image']);
    Route::put('/rooms/{room}/images/{image}/primary', [Admin\RoomController::class, 'setPrimaryImage'])
        ->middleware('permission:manage_rooms')
        ->whereNumber(['room', 'image']);

    // Reservations — routes statiques EN PREMIER (avant apiResource pour éviter les conflits de {id})
    // Compteur d'alertes sidebar : doit être déclaré avant apiResource sinon Laravel matche
    // GET /reservations/{reservation} avec reservation='deposit-alerts' → 404 silencieux
    Route::get('/reservations/deposit-alerts', [Admin\ReservationController::class, 'depositAlerts'])
        ->middleware('permission:manage_reservations');

    Route::apiResource('/reservations', Admin\ReservationController::class)
        ->only(['index', 'show', 'update', 'destroy'])
        ->middleware('permission:manage_reservations');

    // Paiement espèces + reçu admin
    Route::post('/reservations/{id}/cash-payment', [Admin\PaymentController::class, 'cashPayment'])
        ->middleware('permission:manage_reservations')
        ->whereNumber('id');
    Route::get('/reservations/{id}/receipt', [Admin\PaymentController::class, 'receipt'])
        ->middleware('permission:manage_reservations')
        ->whereNumber('id');

    // Clients
    Route::get('/clients',      [Admin\ClientController::class, 'index'])
        ->middleware('permission:manage_clients');
    Route::get('/clients/{id}', [Admin\ClientController::class, 'show'])
        ->middleware('permission:manage_clients')->whereNumber('id');
    Route::get('/clients/{id}/id-document', [Admin\ClientController::class, 'idDocument'])
        ->middleware('permission:manage_clients')->whereNumber('id');

    // Check-in / Check-out
    // Liste des réservations éligibles (groupées par statut acompte)
    Route::get('/checkin-eligible', [Admin\CheckInOutController::class, 'eligible'])
        ->middleware('permission:manage_checkin_checkout');
    Route::post('/checkin/{id}',  [Admin\CheckInOutController::class, 'checkIn'])
        ->middleware('permission:manage_checkin_checkout')->whereNumber('id');
    Route::post('/checkout/{id}', [Admin\CheckInOutController::class, 'checkOut'])
        ->middleware('permission:manage_checkin_checkout')->whereNumber('id');

    // Rapports financiers
    Route::get('/reports', [Admin\ReportController::class, 'summary'])
        ->middleware('permission:view_reports');

    // Journal d'audit (vue simplifiée admin)
    Route::get('/audit-summary', [Admin\AuditSummaryController::class, 'index'])
        ->middleware('permission:view_audit_summary');

    // Remboursements
    Route::get('/refunds',                   [Admin\RefundController::class, 'index'])
        ->middleware('permission:manage_payments');
    Route::post('/refunds/{id}/approve',     [Admin\RefundController::class, 'approve'])
        ->middleware('permission:manage_payments')->whereNumber('id');
    Route::post('/refunds/{id}/reject',      [Admin\RefundController::class, 'reject'])
        ->middleware('permission:manage_payments')->whereNumber('id');
    Route::get('/refunds/{id}/receipt',      [Admin\RefundController::class, 'receipt'])
        ->middleware('permission:manage_payments')->whereNumber('id');

    // Réclamations (service client)
    Route::get('/complaints',                [Admin\ComplaintController::class, 'index'])
        ->middleware('permission:manage_complaints');
    Route::post('/complaints/{id}/handle',   [Admin\ComplaintController::class, 'handle'])
        ->middleware('permission:manage_complaints')->whereNumber('id');

    // Avis clients (lecture seule - inclut les avis négatifs)
    Route::get('/reviews', [Admin\ReviewController::class, 'index'])
        ->middleware('permission:view_reviews');
});

/*
|--------------------------------------------------------------------------
| OWNER — Sanctum + role:owner (full access)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:owner'])->prefix('owner')->group(function () {
    // Admin management
    Route::apiResource('/admins', Owner\AdminController::class);
    Route::patch('/admins/{id}/status', [Owner\AdminController::class, 'toggleStatus'])->whereNumber('id');

    // Dashboard
    Route::get('/dashboard/stats',     [Owner\DashboardController::class, 'stats']);
    Route::get('/dashboard/revenue',   [Owner\DashboardController::class, 'revenue']);
    Route::get('/dashboard/occupancy', [Owner\DashboardController::class, 'occupancy']);

    // Audit logs
    Route::get('/audit-logs',           [Owner\AuditLogController::class, 'index']);
    Route::get('/audit-logs/{adminId}', [Owner\AuditLogController::class, 'byAdmin'])->whereNumber('adminId');

    // Profil propriétaire
    Route::get('/profile',           [Owner\ProfileController::class, 'show']);
    Route::put('/profile',           [Owner\ProfileController::class, 'update']);
    Route::post('/profile/photo',    [Owner\ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo',  [Owner\ProfileController::class, 'deletePhoto']);
    Route::put('/profile/password',  [Owner\ProfileController::class, 'updatePassword']);

    // Avis clients (le propriétaire voit tous les avis)
    Route::get('/reviews', [Admin\ReviewController::class, 'index']);

    // Réservations (lecture seule)
    Route::get('/reservations', [Owner\ReservationController::class, 'index']);

    // Remboursements
    Route::get('/refunds',                    [Owner\RefundController::class, 'index']);
    Route::post('/refunds/{id}/approve',      [Owner\RefundController::class, 'approve'])->whereNumber('id');
    Route::post('/refunds/{id}/reject',       [Owner\RefundController::class, 'reject'])->whereNumber('id');
    Route::get('/refunds/{id}/receipt',       [Owner\RefundController::class, 'receipt'])->whereNumber('id');

    // Réclamations
    Route::get('/complaints',                 [Owner\ComplaintController::class, 'index']);
    Route::post('/complaints/{id}/handle',    [Owner\ComplaintController::class, 'handle'])->whereNumber('id');

    // Chambres (lecture seule)
    Route::get('/rooms',                      [Owner\RoomController::class, 'index']);
    Route::get('/rooms/{id}',                 [Owner\RoomController::class, 'show'])->whereNumber('id');

    // Clients (lecture seule)
    Route::get('/clients',                    [Owner\ClientController::class, 'index']);
    Route::get('/clients/{id}',               [Owner\ClientController::class, 'show'])->whereNumber('id');
    Route::get('/clients/{id}/id-document',   [Owner\ClientController::class, 'idDocument'])->whereNumber('id');
});
