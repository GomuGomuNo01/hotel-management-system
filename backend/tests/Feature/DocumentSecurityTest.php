<?php

namespace Tests\Feature;

use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DocumentSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function uploadDocFor(Client $client): string
    {
        Sanctum::actingAs($client);
        $this->postJson('/api/profile/documents', [
            'documents' => [UploadedFile::fake()->create('cni.pdf', 50, 'application/pdf')],
        ])->assertOk();

        return $client->fresh()->id_documents[0]['path'];
    }

    public function test_uploaded_id_document_is_stored_privately_not_publicly(): void
    {
        Storage::fake('private');
        Storage::fake('public');

        $client = Client::factory()->create();
        $path   = $this->uploadDocFor($client);

        Storage::disk('private')->assertExists($path);   // bien en privé
        Storage::disk('public')->assertMissing($path);   // jamais en public
    }

    public function test_owner_can_stream_their_own_document(): void
    {
        Storage::fake('private');

        $client = Client::factory()->create();
        $path   = $this->uploadDocFor($client);

        $this->getJson('/api/profile/documents/view?path='.urlencode($path))
            ->assertOk();
    }

    public function test_unauthenticated_user_cannot_stream_a_document(): void
    {
        $this->getJson('/api/profile/documents/view?path=clients/1/documents/whatever.pdf')
            ->assertStatus(401);
    }

    public function test_a_client_cannot_stream_another_clients_document(): void
    {
        Storage::fake('private');

        $owner    = Client::factory()->create();
        $path     = $this->uploadDocFor($owner);
        $attacker = Client::factory()->create();

        Sanctum::actingAs($attacker);
        $this->getJson('/api/profile/documents/view?path='.urlencode($path))
            ->assertStatus(404); // le chemin n'appartient pas à l'attaquant
    }

    public function test_profile_resource_never_exposes_a_public_url_for_documents(): void
    {
        Storage::fake('private');

        $client = Client::factory()->create();
        $this->uploadDocFor($client);

        $response = $this->getJson('/api/profile')->assertOk();
        $doc = $response->json('data.id_documents.0');

        $this->assertArrayHasKey('path', $doc);
        $this->assertArrayHasKey('name', $doc);
        $this->assertArrayNotHasKey('url', $doc); // aucune URL publique
    }
}
