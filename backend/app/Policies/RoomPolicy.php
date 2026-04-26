<?php

namespace App\Policies;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\Room;

class RoomPolicy
{
    /**
     * Owners always pass any check (they grant the permissions).
     */
    public function before($user, string $ability): ?bool
    {
        if ($user instanceof Owner) {
            return true;
        }
        return null;
    }

    public function viewAny(Admin $admin): bool
    {
        return $admin->hasPermission('manage_rooms')
            || $admin->hasPermission('view_reports');
    }

    public function view(Admin $admin, Room $room = null): bool
    {
        return $this->viewAny($admin);
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
