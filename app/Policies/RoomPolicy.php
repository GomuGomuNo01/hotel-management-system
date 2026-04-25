<?php

namespace App\Policies;

use App\Models\Admin;
use App\Models\Room;

class RoomPolicy
{
    public function viewAny(Admin $admin): bool
    {
        return $admin->hasPermission('manage_rooms') || $admin->hasPermission('view_reports');
    }

    public function create(Admin $admin): bool
    {
        return $admin->hasPermission('manage_rooms');
    }

    public function update(Admin $admin, Room $room = null): bool
    {
        return $admin->hasPermission('manage_rooms');
    }

    public function delete(Admin $admin, Room $room = null): bool
    {
        return $admin->hasPermission('manage_rooms');
    }
}
