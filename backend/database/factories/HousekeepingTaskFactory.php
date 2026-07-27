<?php

namespace Database\Factories;

use App\Models\HousekeepingTask;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;

class HousekeepingTaskFactory extends Factory
{
    protected $model = HousekeepingTask::class;

    public function definition(): array
    {
        return [
            'room_id'        => Room::factory(),
            'reservation_id' => Reservation::factory(),
            'type'           => HousekeepingTask::TYPE_STAYOVER,
            'scheduled_for'  => now()->toDateString(),
            'status'         => HousekeepingTask::STATUS_PENDING,
            'deferred_count' => 0,
        ];
    }
}
