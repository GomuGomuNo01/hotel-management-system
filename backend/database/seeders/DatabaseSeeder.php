<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\Owner;
use App\Models\Room;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $owner = Owner::firstOrCreate(
            ['email' => 'patron@hotel.local'],
            [
                'full_name' => 'Patron Principal',
                'password'  => Hash::make('password'),
            ]
        );

        $admin = Admin::firstOrCreate(
            ['email' => 'admin@hotel.local'],
            [
                'first_name'           => 'Admin',
                'last_name'            => 'Principal',
                'password'             => Hash::make('password'),
                'role'                 => 'Réceptionniste',
                'is_active'            => true,
                'must_change_password' => false,
                'created_by_owner_id'  => $owner->id,
            ]
        );

        foreach (AdminPermission::KEYS as $key) {
            AdminPermission::firstOrCreate([
                'admin_id'       => $admin->id,
                'permission_key' => $key,
            ]);
        }

        Client::firstOrCreate(
            ['email' => 'client@hotel.local'],
            [
                'first_name'  => 'Jean',
                'last_name'   => 'Dupont',
                'phone'       => '+225 07 00 00 00',
                'password'    => Hash::make('password'),
                'provider'    => 'local',
            ]
        );

        $rooms = [
            ['room_number' => '101', 'room_type' => 'simple',    'price_per_night' => 25000, 'capacity' => 1, 'description' => 'Chambre simple confortable'],
            ['room_number' => '102', 'room_type' => 'simple',    'price_per_night' => 25000, 'capacity' => 1, 'description' => 'Chambre simple vue jardin'],
            ['room_number' => '201', 'room_type' => 'double',    'price_per_night' => 45000, 'capacity' => 2, 'description' => 'Chambre double avec balcon'],
            ['room_number' => '202', 'room_type' => 'double',    'price_per_night' => 45000, 'capacity' => 2, 'description' => 'Chambre double vue piscine'],
            ['room_number' => '301', 'room_type' => 'suite',     'price_per_night' => 95000, 'capacity' => 2, 'description' => 'Suite présidentielle'],
            ['room_number' => '401', 'room_type' => 'familiale', 'price_per_night' => 75000, 'capacity' => 4, 'description' => 'Suite familiale 4 personnes'],
        ];

        foreach ($rooms as $room) {
            Room::firstOrCreate(
                ['room_number' => $room['room_number']],
                array_merge($room, [
                    'status'    => 'available',
                    'amenities' => ['WiFi', 'Climatisation', 'TV', 'Mini-bar'],
                ])
            );
        }
    }
}
