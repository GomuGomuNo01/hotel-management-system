<?php

return [

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect'      => env('GOOGLE_REDIRECT_URI'),
    ],

    'orange_ci' => [
        'api_url'        => env('ORANGE_CI_API_URL', 'https://api.orange.com/orange-money-webpay/ci/v1'),
        'merchant_key'   => env('ORANGE_CI_MERCHANT_KEY'),
        'webhook_secret' => env('ORANGE_CI_WEBHOOK_SECRET'),
    ],

    'wave_ci' => [
        'api_url'        => env('WAVE_CI_API_URL', 'https://api.wave.com/v1'),
        'api_key'        => env('WAVE_CI_API_KEY'),
        'webhook_secret' => env('WAVE_CI_WEBHOOK_SECRET'),
    ],

    // Paiement — le mode simulation permet de confirmer un paiement sans
    // agrégateur (POST /payments/{id}/simulate). Il DOIT rester désactivé en
    // production : défaut false, activé uniquement en local via PAYMENT_SIMULATION.
    'payment' => [
        'simulation'     => (bool) env('PAYMENT_SIMULATION', false),
        'expiry_minutes' => (int) env('PAYMENT_EXPIRY_MINUTES', 30),
    ],

];
