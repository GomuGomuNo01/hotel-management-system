<?php

namespace App\Providers;

use App\Events\PaymentReceived;
use App\Events\ReservationConfirmed;
use App\Listeners\SendPaymentReceiptEmail;
use App\Listeners\SendReservationConfirmationEmail;
use App\Models\Admin;
use App\Observers\AdminObserver;
use App\Policies\ReservationPolicy;
use App\Policies\RoomPolicy;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
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

        Event::listen(ReservationConfirmed::class, SendReservationConfirmationEmail::class);
        Event::listen(PaymentReceived::class, SendPaymentReceiptEmail::class);

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
