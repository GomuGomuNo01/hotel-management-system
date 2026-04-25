<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Client;
use App\Http\Controllers\Owner;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AUTH — Routes publiques (throttle: 5 req/min)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->middleware('throttle:5,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
    Route::get('/google/redirect', [GoogleAuthController::class, 'redirect']);
    Route::get('/google/callback', [GoogleAuthController::class, 'callback']);
});

/*
|--------------------------------------------------------------------------
| WEBHOOKS PAIEMENT — Publics mais sécurisés par HMAC
|--------------------------------------------------------------------------
*/
Route::post('/webhooks/orange', [Client\PaymentController::class, 'webhookOrange'])
    ->middleware('webhook:orange');

Route::post('/webhooks/wave', [Client\PaymentController::class, 'webhookWave'])
    ->middleware('webhook:wave');

/*
|--------------------------------------------------------------------------
| CLIENT — Authentifié via Sanctum + rôle client
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:client'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Chambres (consultation)
    Route::get('/rooms',      [Client\RoomController::class, 'index']);
    Route::get('/rooms/{id}', [Client\RoomController::class, 'show']);

    // Réservations client
    Route::apiResource('/reservations', Client\ReservationController::class);

    // Paiements
    Route::post('/payments/initiate',       [Client\PaymentController::class, 'initiate']);
    Route::get('/payments/{id}/status',     [Client\PaymentController::class, 'status']);
    Route::get('/payments/{id}/invoice',    [Client\PaymentController::class, 'invoice']);
});

/*
|--------------------------------------------------------------------------
| ADMIN — Authentifié via Sanctum + rôle admin
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Chambres (CRUD avec permission)
    Route::apiResource('/rooms', Admin\RoomController::class)
        ->middleware('permission:manage_rooms');

    // Réservations admin
    Route::apiResource('/reservations', Admin\ReservationController::class)
        ->only(['index', 'show', 'update', 'destroy'])
        ->middleware('permission:manage_reservations');

    // Clients
    Route::get('/clients',      [Admin\ClientController::class, 'index'])->middleware('permission:manage_clients');
    Route::get('/clients/{id}', [Admin\ClientController::class, 'show'])->middleware('permission:manage_clients');

    // Check-in / Check-out
    Route::post('/checkin/{id}',  [Admin\CheckInOutController::class, 'checkIn'])->middleware('permission:manage_checkin_checkout');
    Route::post('/checkout/{id}', [Admin\CheckInOutController::class, 'checkOut'])->middleware('permission:manage_checkin_checkout');
});

/*
|--------------------------------------------------------------------------
| OWNER — Authentifié via Sanctum + rôle owner (accès total)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:owner'])->prefix('owner')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Gestion des administrateurs
    Route::apiResource('/admins', Owner\AdminController::class);
    Route::patch('/admins/{id}/status', [Owner\AdminController::class, 'toggleStatus']);

    // Dashboard
    Route::get('/dashboard/stats',     [Owner\DashboardController::class, 'stats']);
    Route::get('/dashboard/revenue',   [Owner\DashboardController::class, 'revenue']);
    Route::get('/dashboard/occupancy', [Owner\DashboardController::class, 'occupancy']);

    // Audit
    Route::get('/audit-logs',               [Owner\AuditLogController::class, 'index']);
    Route::get('/audit-logs/{adminId}',     [Owner\AuditLogController::class, 'byAdmin']);
});
