<?php

namespace Database\Factories;

use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;

class RoomFactory extends Factory
{
    protected $model = Room::class;

    public function definition(): array
    {
        return [
            'room_number'     => $this->faker->unique()->numerify('R###'),
            'room_type'       => $this->faker->randomElement(['simple', 'double', 'suite', 'familiale']),
            'price_per_night' => $this->faker->randomElement([25000, 40000, 60000, 90000]),
            'capacity'        => $this->faker->numberBetween(1, 4),
            'status'          => 'available',
        ];
    }

    public function occupied(): static
    {
        return $this->state(fn () => ['status' => 'occupied']);
    }
}
