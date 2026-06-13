<?php

namespace App\Providers;

use App\Models\Admin;
use App\Observers\AdminObserver;
use App\Policies\ReservationPolicy;
use App\Policies\RoomPolicy;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Admin::observe(AdminObserver::class);

        Gate::policy(Reservation::class, ReservationPolicy::class);
        Gate::policy(Room::class, RoomPolicy::class);

        // NB : les listeners de notification (SendReservationConfirmedNotification,
        // SendPaymentReceivedNotification) sont auto-découverts par Laravel dans
        // app/Listeners. Ne PAS les réenregistrer ici sous peine de double envoi.

        Schema::defaultStringLength(191);

        $this->configureRateLimiting();
    }

    /**
     * Named rate limiters used by the api middleware group
     * (referenced via `throttleApi()` in bootstrap/app.php).
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
