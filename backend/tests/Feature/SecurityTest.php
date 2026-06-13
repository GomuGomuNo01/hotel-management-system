<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Tests de la couche sécurité (middleware / exceptions).
 * Volontairement sans accès base : assertions au niveau HTTP, donc rapides
 * et indépendantes du moteur de base de données.
 */
class SecurityTest extends TestCase
{
    /** Un endpoint protégé doit refuser une requête non authentifiée. */
    public function test_protected_route_rejects_unauthenticated(): void
    {
        $this->getJson('/api/owner/profile')
            ->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    /** Toutes les réponses API portent les en-têtes de sécurité. */
    public function test_responses_include_security_headers(): void
    {
        $response = $this->getJson('/api/owner/profile'); // 401, mais traverse le groupe api

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    /** Une route API inconnue renvoie un 404 JSON normalisé (pas une page HTML). */
    public function test_unknown_api_route_returns_json_404(): void
    {
        $this->getJson('/api/route-inexistante-xyz')
            ->assertStatus(404)
            ->assertJson(['success' => false]);
    }
}
