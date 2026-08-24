<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\Owner;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Couvre le rapport financier — y compris les agrégats par mois/jour qui
 * utilisaient du SQL MySQL-only (DATE_FORMAT / DAY) désormais rendu portable.
 * Ces tests s'exécutent sur SQLite et valident donc la version agnostique.
 */
class ReportTest extends TestCase
{
    use RefreshDatabase;

    private function adminWithReports(): Admin
    {
        $admin = Admin::factory()->create();
        AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => 'view_reports']);
        return $admin;
    }

    private function successfulPayment(float $amount, string $provider): Payment
    {
        $client      = Client::factory()->create();
        $room        = Room::factory()->create();
        $reservation = Reservation::factory()->create([
            'client_id'    => $client->id,
            'room_id'      => $room->id,
            'total_amount' => $amount,
        ]);

        return Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'provider'       => $provider,
            'amount'         => $amount,
            'status'         => 'success',
            'confirmed_at'   => now(),
            'created_at'     => now(),
        ]);
    }

    public function test_reports_require_view_reports_permission(): void
    {
        Sanctum::actingAs(Admin::factory()->create());
        $this->getJson('/api/admin/reports')->assertForbidden();
    }

    public function test_report_aggregates_revenue_and_monthly_daily_series(): void
    {
        $this->successfulPayment(100000, 'orange_ci');
        $this->successfulPayment(50000, 'cash');

        Sanctum::actingAs($this->adminWithReports());

        $res = $this->getJson('/api/admin/reports')->assertOk();

        // Revenu du mois = somme des paiements réussis.
        $res->assertJsonPath('data.revenue.this_month', 150000);
        $res->assertJsonPath('data.revenue.all_time', 150000);

        // Série mensuelle (DATE_FORMAT → strftime) : le mois courant est présent.
        $month = now()->format('Y-m');
        $byMonth = collect($res->json('data.revenue.by_month'));
        $this->assertTrue($byMonth->contains(fn ($r) => $r['month'] === $month && (float) $r['total'] === 150000.0));

        // Série journalière (DAY → strftime) : le jour courant est présent et entier.
        $today  = (int) now()->format('d');
        $daily  = collect($res->json('data.revenue.daily'));
        $this->assertTrue($daily->contains(fn ($r) => (int) $r['day'] === $today));

        // Répartition par méthode de paiement.
        $methods = collect($res->json('data.payment_methods'))->pluck('total', 'method');
        $this->assertSame(100000.0, (float) $methods['orange_ci']);
        $this->assertSame(50000.0, (float) $methods['cash']);
    }

    public function test_report_reflects_refunds_in_net_revenue(): void
    {
        $payment = $this->successfulPayment(100000, 'orange_ci');
        Refund::create([
            'reservation_id' => $payment->reservation_id,
            'client_id'      => $payment->client_id,
            'amount'         => 40000,
            'status'         => 'approved',
            'processed_at'   => now(),
        ]);

        Sanctum::actingAs($this->adminWithReports());

        $this->getJson('/api/admin/reports')
            ->assertOk()
            ->assertJsonPath('data.revenue.net_this_month', 60000)
            ->assertJsonPath('data.refunds.amount_this_month', 40000);
    }

    // ── Accès propriétaire ──────────────────────────────────────

    /**
     * Le propriétaire consulte le même rapport que l'admin, sans avoir à
     * détenir la permission view_reports : son accès est complet par nature.
     */
    public function test_owner_gets_the_same_report_as_an_admin(): void
    {
        $this->successfulPayment(100000, 'orange_ci');

        Sanctum::actingAs($this->adminWithReports());
        $forAdmin = $this->getJson('/api/admin/reports')->assertOk()->json('data');

        Sanctum::actingAs(Owner::factory()->create());
        $forOwner = $this->getJson('/api/owner/reports')->assertOk()->json('data');

        $this->assertSame($forAdmin['revenue'], $forOwner['revenue']);
        $this->assertSame($forAdmin['payment_methods'], $forOwner['payment_methods']);
    }

    /** Un admin ne doit pas atteindre le rapport par la route du propriétaire. */
    public function test_admin_cannot_reach_the_owner_report_route(): void
    {
        Sanctum::actingAs($this->adminWithReports());

        $this->getJson('/api/owner/reports')->assertForbidden();
    }

    /** La route admin reste protégée par la permission view_reports. */
    public function test_admin_without_permission_is_still_refused(): void
    {
        Sanctum::actingAs(Admin::factory()->create());

        $this->getJson('/api/admin/reports')->assertForbidden();
    }
}
