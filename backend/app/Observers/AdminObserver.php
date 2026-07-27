<?php

namespace App\Observers;

use App\Models\Admin;
use App\Models\AuditLog;

class AdminObserver
{
    public function created(Admin $admin): void
    {
        // Admin creation is logged manually in AdminController to capture the owner context
    }

    public function updated(Admin $admin): void
    {
        // Only log if an admin is modifying themselves (unusual case)
        // Main audit logging is done in AdminController via AuditService
    }
}
