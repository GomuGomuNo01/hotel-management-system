<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\Reservation;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'reservation_id'        => Reservation::factory(),
            'client_id'             => fn (array $attrs) => Reservation::find($attrs['reservation_id'])?->client_id
                                        ?? \App\Models\Client::factory(),
            'provider'              => 'cash',
            'amount'                => 120000,
            'currency'              => 'XOF',
            'transaction_reference' => 'TEST-'.strtoupper($this->faker->unique()->bothify('????####')),
            'status'                => 'success',
            'payment_type'          => 'full',
            'confirmed_at'          => now(),
            'simulation_mode'       => false,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => 'pending', 'confirmed_at' => null]);
    }
}
