<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Refund;
use App\Models\Reservation;
use Illuminate\Database\Eloquent\Factories\Factory;

class RefundFactory extends Factory
{
    protected $model = Refund::class;

    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory(),
            'client_id'      => fn (array $attrs) => Reservation::find($attrs['reservation_id'])?->client_id
                                    ?? Client::factory(),
            'amount'         => 60000,
            'status'         => 'pending',
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status'       => 'approved',
            'processed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status'       => 'rejected',
            'processed_at' => now(),
        ]);
    }
}
