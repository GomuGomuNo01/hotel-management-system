<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReservationFactory extends Factory
{
    protected $model = Reservation::class;

    public function definition(): array
    {
        $checkIn  = now()->addDays(2)->startOfDay();
        $checkOut = (clone $checkIn)->addDays(3);

        return [
            'client_id'      => Client::factory(),
            'room_id'        => Room::factory(),
            'check_in_date'  => $checkIn->toDateString(),
            'check_out_date' => $checkOut->toDateString(),
            'status'         => 'pending',
            'total_amount'   => 120000,
            'payment_plan'   => 'full',
        ];
    }

    public function confirmed(): static
    {
        return $this->state(fn () => ['status' => 'confirmed']);
    }

    public function checkedIn(): static
    {
        return $this->state(fn () => ['status' => 'checked_in']);
    }

    public function partial(): static
    {
        return $this->state(fn () => ['payment_plan' => 'partial']);
    }
}
