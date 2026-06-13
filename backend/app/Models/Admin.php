<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Authenticatable
{
    // SoftDeletes : la suppression d'un admin conserve sa ligne en base, ce qui
    // préserve son journal d'audit (audit_logs.admin_id est en cascadeOnDelete).
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'date_of_birth',
        'place_of_birth',
        'gender',
        'address_line',
        'city',
        'id_document_type',
        'id_document_number',
        'id_document_path',
        'id_documents',
        'emergency_contact_name',
        'emergency_contact_phone',
        'job_title',
        'hired_at',
        'profile_photo',
        'bio',
        'password',
        'role',
        'is_active',
        'must_change_password',
        'created_by_owner_id',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password'             => 'hashed',
            'is_active'            => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at'        => 'datetime',
            'date_of_birth'        => 'date',
            'hired_at'             => 'date',
            'id_documents'         => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class, 'created_by_owner_id');
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(AdminPermission::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function hasPermission(string $permission): bool
    {
        return $this->permissions()->where('permission_key', $permission)->exists();
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->last_name} {$this->first_name}");
    }
}
