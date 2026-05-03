<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\StoreAdminRequest;
use App\Http\Requests\Owner\UpdateAdminRequest;
use App\Mail\AdminCredentialsMail;
use App\Models\Admin;
use App\Models\AdminPermission;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $admins = Admin::with('permissions')
            ->withCount('auditLogs')
            ->paginate(20);

        return $this->success($admins);
    }

    public function store(StoreAdminRequest $request): JsonResponse
    {
        $temporaryPassword = Str::password(12, true, true, false);

        $admin = DB::transaction(function () use ($request, $temporaryPassword) {
            $admin = Admin::create([
                'first_name'               => $request->first_name,
                'last_name'                => $request->last_name,
                'email'                    => $request->email,
                'password'                 => Hash::make($temporaryPassword),
                'role'                     => $request->role,
                'is_active'                => true,
                'must_change_password'     => true,
                'created_by_owner_id'      => $request->user()->id,
                'phone'                    => $request->phone,
                'date_of_birth'            => $request->date_of_birth,
                'place_of_birth'           => $request->place_of_birth,
                'id_document_type'         => $request->id_document_type,
                'emergency_contact_name'   => $request->emergency_contact_name,
                'emergency_contact_phone'  => $request->emergency_contact_phone,
                'job_title'                => $request->job_title,
            ]);

            if ($request->filled('permissions')) {
                $permissions = collect($request->permissions)->map(fn ($key) => [
                    'admin_id'       => $admin->id,
                    'permission_key' => $key,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
                AdminPermission::insert($permissions->toArray());
            }

            $fileUpdates = [];

            if ($request->hasFile('identity_photo')) {
                $ext  = $request->file('identity_photo')->getClientOriginalExtension();
                $path = $request->file('identity_photo')->storeAs(
                    "admins/{$admin->id}",
                    'identity_photo_'.time().'.'.$ext,
                    'public'
                );
                $fileUpdates['profile_photo'] = $path;
            }

            if ($request->hasFile('id_document_path')) {
                $ext  = $request->file('id_document_path')->getClientOriginalExtension();
                $path = $request->file('id_document_path')->storeAs(
                    "admins/{$admin->id}",
                    'document_'.time().'.'.$ext,
                    'public'
                );
                $fileUpdates['id_document_path'] = $path;
            }

            if (! empty($fileUpdates)) {
                $admin->update($fileUpdates);
            }

            return $admin;
        });

        Mail::to($admin->email)->send(new AdminCredentialsMail($admin, $temporaryPassword));

        return $this->created(
            $admin->load('permissions'),
            'Administrateur créé avec succès. Les identifiants ont été envoyés par e-mail.'
        );
    }

    public function show(int $id): JsonResponse
    {
        $admin = Admin::with(['permissions', 'auditLogs' => fn ($q) => $q->latest()->limit(20)])->find($id);

        if (! $admin) {
            return $this->notFound('Administrateur introuvable.');
        }

        return $this->success($admin);
    }

    public function update(UpdateAdminRequest $request, int $id): JsonResponse
    {
        $admin = Admin::find($id);
        if (! $admin) {
            return $this->notFound('Administrateur introuvable.');
        }

        DB::transaction(function () use ($request, $admin) {
            $admin->update($request->only([
                'first_name',
                'last_name',
                'email',
                'role',
                'phone',
                'date_of_birth',
                'place_of_birth',
                'id_document_type',
                'emergency_contact_name',
                'emergency_contact_phone',
                'job_title',
            ]));

            if ($request->has('permissions')) {
                $admin->permissions()->delete();

                if (! empty($request->permissions)) {
                    $permissions = collect($request->permissions)->map(fn ($key) => [
                        'admin_id'       => $admin->id,
                        'permission_key' => $key,
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);
                    AdminPermission::insert($permissions->toArray());
                }
            }

            $fileUpdates = [];

            if ($request->hasFile('identity_photo')) {
                $ext  = $request->file('identity_photo')->getClientOriginalExtension();
                $path = $request->file('identity_photo')->storeAs(
                    "admins/{$admin->id}",
                    'identity_photo_'.time().'.'.$ext,
                    'public'
                );
                $fileUpdates['profile_photo'] = $path;
            }

            if ($request->hasFile('id_document_path')) {
                $ext  = $request->file('id_document_path')->getClientOriginalExtension();
                $path = $request->file('id_document_path')->storeAs(
                    "admins/{$admin->id}",
                    'document_'.time().'.'.$ext,
                    'public'
                );
                $fileUpdates['id_document_path'] = $path;
            }

            if (! empty($fileUpdates)) {
                $admin->update($fileUpdates);
            }
        });

        return $this->success($admin->fresh()->load('permissions'), 'Administrateur mis à jour.');
    }

    public function destroy(int $id): JsonResponse
    {
        $admin = Admin::find($id);
        if (! $admin) {
            return $this->notFound('Administrateur introuvable.');
        }

        $admin->tokens()->delete();
        $admin->delete();

        return $this->success(message: 'Administrateur supprimé.');
    }

    public function toggleStatus(int $id): JsonResponse
    {
        $admin = Admin::find($id);
        if (! $admin) {
            return $this->notFound('Administrateur introuvable.');
        }

        $admin->update(['is_active' => ! $admin->is_active]);

        $status = $admin->is_active ? 'activé' : 'désactivé';

        if (! $admin->is_active) {
            $admin->tokens()->delete();
        }

        return $this->success($admin, "Compte administrateur {$status}.");
    }
}
