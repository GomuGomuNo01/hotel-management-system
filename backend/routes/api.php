<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Client;
use App\Http\Controllers\Owner;
use App\Http\Controllers\Public\RoomController as PublicRoomController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| PUBLIC — No authentication required
|--------------------------------------------------------------------------
| Anyone (visitors, guests) can browse the room catalogue. Authentication
| is only enforced when they actually try to make a reservation.
*/
Route::prefix('rooms')->group(function () {
    Route::get('/',     [PublicRoomController::class, 'index']);
    Route::get('/{id}', [PublicRoomController::class, 'show'])->whereNumber('id');
});

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
});

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
    // Profile
    Route::get('/profile',            [Client\ProfileController::class, 'show']);
    Route::patch('/profile',          [Client\ProfileController::class, 'update']);
    Route::patch('/profile/password', [Client\ProfileController::class, 'updatePassword']);
    Route::post('/profile/photo',     [Client\ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo',   [Client\ProfileController::class, 'deletePhoto']);

    // Reservations
    Route::apiResource('/reservations', Client\ReservationController::class);

    // Payments
    Route::post('/payments/initiate',    [Client\PaymentController::class, 'initiate']);
    Route::get('/payments/{id}/status',  [Client\PaymentController::class, 'status'])->whereNumber('id');
    Route::get('/payments/{id}/invoice', [Client\PaymentController::class, 'invoice'])->whereNumber('id');
});

/*
|--------------------------------------------------------------------------
| ADMIN — Sanctum + role:admin
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    // Dashboard
    Route::get('/dashboard/stats', [Admin\DashboardController::class, 'stats']);

    // Rooms (CRUD)
    Route::apiResource('/rooms', Admin\RoomController::class)
        ->middleware('permission:manage_rooms');

    // Reservations
    Route::apiResource('/reservations', Admin\ReservationController::class)
        ->only(['index', 'show', 'update', 'destroy'])
        ->middleware('permission:manage_reservations');

    // Clients
    Route::get('/clients',      [Admin\ClientController::class, 'index'])
        ->middleware('permission:manage_clients');
    Route::get('/clients/{id}', [Admin\ClientController::class, 'show'])
        ->middleware('permission:manage_clients')->whereNumber('id');

    // Check-in / Check-out
    Route::post('/checkin/{id}',  [Admin\CheckInOutController::class, 'checkIn'])
        ->middleware('permission:manage_checkin_checkout')->whereNumber('id');
    Route::post('/checkout/{id}', [Admin\CheckInOutController::class, 'checkOut'])
        ->middleware('permission:manage_checkin_checkout')->whereNumber('id');
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
});
