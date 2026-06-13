<?php

namespace Database\Factories;

use App\Models\Admin;
use App\Models\Owner;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class AdminFactory extends Factory
{
    protected $model = Admin::class;

    public function definition(): array
    {
        return [
            'first_name'           => $this->faker->firstName(),
            'last_name'            => $this->faker->lastName(),
            'email'                => $this->faker->unique()->safeEmail(),
            'password'             => Hash::make('password'),
            'role'                 => 'manager',
            'is_active'            => true,
            'must_change_password' => false,
            'created_by_owner_id'  => Owner::factory(),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
