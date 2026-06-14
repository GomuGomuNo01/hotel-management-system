<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Complaint;
use App\Models\Reservation;
use Illuminate\Database\Eloquent\Factories\Factory;

class ComplaintFactory extends Factory
{
    protected $model = Complaint::class;

    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory()->checkedIn(),
            'client_id'      => fn (array $attrs) => Reservation::find($attrs['reservation_id'])?->client_id
                                    ?? Client::factory(),
            'category'       => $this->faker->randomElement(array_keys(Complaint::CATEGORIES)),
            'message'        => $this->faker->sentence(12),
            'status'         => 'open',
        ];
    }

    public function handled(): static
    {
        return $this->state(fn () => [
            'status'         => 'handled',
            'admin_response' => $this->faker->sentence(),
            'handled_at'     => now(),
        ]);
    }
}
