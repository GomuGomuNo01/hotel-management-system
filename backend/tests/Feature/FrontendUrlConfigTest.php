<?php

namespace Tests\Feature;

use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Garantit que les redirections vers le frontend s'appuient sur la CONFIG
 * (config('app.frontend_url')) et non sur env('FRONTEND_URL') appelé à
 * l'exécution — ce dernier renvoie null après `php artisan config:cache`,
 * cassant silencieusement les liens de vérification d'e-mail / reset en prod.
 */
class FrontendUrlConfigTest extends TestCase
{
    use RefreshDatabase;

    public function test_frontend_url_is_defined_in_config(): void
    {
        $this->assertNotEmpty(config('app.frontend_url'));
    }

    public function test_email_verification_redirects_to_configured_frontend_url(): void
    {
        // Valeur arbitraire : si le code lit la config, la redirection la reflète.
        config(['app.frontend_url' => 'https://app.example.test']);

        $client = Client::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('verification.verify', Carbon::now()->addHour(), [
            'id'   => $client->id,
            'hash' => sha1($client->email),
        ]);

        $this->get($url)->assertRedirect('https://app.example.test/email-verifie?status=success');

        $this->assertNotNull($client->fresh()->email_verified_at);
    }

    public function test_invalid_verification_hash_redirects_to_configured_url(): void
    {
        config(['app.frontend_url' => 'https://app.example.test']);

        $client = Client::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('verification.verify', Carbon::now()->addHour(), [
            'id'   => $client->id,
            'hash' => 'mauvais-hash',
        ]);

        $this->get($url)->assertRedirect('https://app.example.test/email-verifie?status=invalid');
        $this->assertNull($client->fresh()->email_verified_at);
    }
}
