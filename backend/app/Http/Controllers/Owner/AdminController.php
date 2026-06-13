<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\StoreAdminRequest;
use App\Http\Requests\Owner\UpdateAdminRequest;
use App\Http\Resources\AdminResource;
use App\Mail\AdminCredentialsMail;
use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\AuditLog;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
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
                'gender'                   => $request->gender,
                'address_line'             => $request->address_line,
                'city'                     => $request->city,
                'id_document_type'         => $request->id_document_type,
                'id_document_number'       => $request->id_document_number,
                'emergency_contact_name'   => $request->emergency_contact_name,
                'emergency_contact_phone'  => $request->emergency_contact_phone,
                'job_title'                => $request->job_title,
                'hired_at'                 => $request->hired_at,
                'bio'                      => $request->bio,
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
                $path = $this->resizeAndStorePhoto(
                    $request->file('identity_photo'),
                    "admins/{$admin->id}",
                    'identity_photo'
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

            // Pièces d'identité (liste — même logique que le profil client)
            if ($request->hasFile('id_documents')) {
                $docs = [];
                foreach ($request->file('id_documents') as $file) {
                    $stored = $file->store("admins/{$admin->id}/documents", 'public');
                    $docs[] = ['path' => $stored, 'name' => $file->getClientOriginalName()];
                }
                $fileUpdates['id_documents'] = $docs;
            }

            if (! empty($fileUpdates)) {
                $admin->update($fileUpdates);
            }

            return $admin;
        });

        // Audit de création
        AuditService::log(
            $request->user(),
            AuditLog::ACTION_ADMIN_CREATED,
            'Admin',
            $admin->id,
            null,
            [
                'full_name'   => trim("{$admin->first_name} {$admin->last_name}"),
                'email'       => $admin->email,
                'role'        => $admin->role,
                'permissions' => $request->permissions ?? [],
            ]
        );

        Mail::to($admin->email)->send(new AdminCredentialsMail($admin, $temporaryPassword));

        return $this->created(
            new AdminResource($admin->load('permissions')),
            'Administrateur créé avec succès. Les identifiants ont été envoyés par e-mail.'
        );
    }

    public function show(int $id): JsonResponse
    {
        $admin = Admin::with(['permissions', 'auditLogs' => fn ($q) => $q->latest()->limit(20)])->find($id);

        if (! $admin) {
            return $this->notFound('Administrateur introuvable.');
        }

        return $this->success(new AdminResource($admin));
    }

    public function update(UpdateAdminRequest $request, int $id): JsonResponse
    {
        $admin = Admin::find($id);
        if (! $admin) {
            return $this->notFound('Administrateur introuvable.');
        }

        $oldValues = $admin->only([
            'first_name', 'last_name', 'email', 'role', 'phone',
            'gender', 'address_line', 'city',
            'date_of_birth', 'place_of_birth', 'id_document_type', 'id_document_number',
            'emergency_contact_name', 'emergency_contact_phone', 'job_title', 'hired_at', 'bio',
        ]);
        $oldPermissions = $admin->permissions()->pluck('permission_key')->toArray();

        DB::transaction(function () use ($request, $admin) {
            $admin->update($request->only([
                'first_name', 'last_name', 'email', 'role', 'phone',
                'date_of_birth', 'place_of_birth',
                'gender', 'address_line', 'city',
                'id_document_type', 'id_document_number',
                'emergency_contact_name', 'emergency_contact_phone',
                'job_title', 'hired_at', 'bio',
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
                // Supprimer l'ancienne photo si elle existe
                if ($admin->profile_photo && ! str_starts_with($admin->profile_photo, 'http')) {
                    Storage::disk('public')->delete($admin->profile_photo);
                }
                $path = $this->resizeAndStorePhoto(
                    $request->file('identity_photo'),
                    "admins/{$admin->id}",
                    'identity_photo'
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

            // Pièces d'identité (liste) — le frontend envoie l'état souhaité :
            //  • existing_documents[] : chemins des documents existants à conserver
            //  • id_documents[]       : nouveaux fichiers à ajouter
            // Les documents existants absents de existing_documents sont supprimés.
            if ($request->boolean('sync_documents')) {
                $keep    = (array) $request->input('existing_documents', []);
                $current = is_array($admin->id_documents) ? $admin->id_documents : [];
                $kept    = [];

                foreach ($current as $doc) {
                    $path = is_array($doc) ? ($doc['path'] ?? null) : $doc;
                    if ($path && in_array($path, $keep, true)) {
                        $kept[] = is_array($doc) ? $doc : ['path' => $path, 'name' => basename($path)];
                    } elseif ($path && ! str_starts_with($path, 'http')) {
                        Storage::disk('public')->delete($path);
                    }
                }

                if ($request->hasFile('id_documents')) {
                    foreach ($request->file('id_documents') as $file) {
                        $stored = $file->store("admins/{$admin->id}/documents", 'public');
                        $kept[] = ['path' => $stored, 'name' => $file->getClientOriginalName()];
                    }
                }

                $fileUpdates['id_documents'] = array_values($kept);
            }

            if (! empty($fileUpdates)) {
                $admin->update($fileUpdates);
            }
        });

        $fresh = $admin->fresh()->load('permissions');

        // Audit de modification
        AuditService::log(
            $request->user(),
            AuditLog::ACTION_ADMIN_UPDATED,
            'Admin',
            $admin->id,
            array_merge($oldValues, ['permissions' => $oldPermissions]),
            array_merge(
                $fresh->only(array_keys($oldValues)),
                ['permissions' => $fresh->permissions->pluck('permission_key')->toArray()]
            )
        );

        return $this->success(new AdminResource($fresh), 'Administrateur mis à jour.');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $admin = Admin::find($id);
        if (! $admin) {
            return $this->notFound('Administrateur introuvable.');
        }

        $snapshot = [
            'full_name' => trim("{$admin->first_name} {$admin->last_name}"),
            'email'     => $admin->email,
            'role'      => $admin->role,
        ];

        $admin->tokens()->delete();
        $admin->delete();

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_ADMIN_DELETED,
            'Admin',
            $id,
            $snapshot,
            null
        );

        return $this->success(message: 'Administrateur supprimé.');
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $admin = Admin::find($id);
        if (! $admin) {
            return $this->notFound('Administrateur introuvable.');
        }

        $wasActive = $admin->is_active;
        $admin->update(['is_active' => ! $wasActive]);

        $status = $admin->is_active ? 'activé' : 'désactivé';

        if (! $admin->is_active) {
            $admin->tokens()->delete();
        }

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_ADMIN_STATUS_CHANGED,
            'Admin',
            $admin->id,
            ['is_active' => $wasActive, 'full_name' => trim("{$admin->first_name} {$admin->last_name}")],
            ['is_active' => $admin->is_active, 'status' => $status]
        );

        return $this->success(new AdminResource($admin->fresh()), "Compte administrateur {$status}.");
    }

    /**
     * Redimensionne une photo en carré 400×400 et la stocke dans le disque public.
     */
    private function resizeAndStorePhoto(\Illuminate\Http\UploadedFile $file, string $dir, string $basename): string
    {
        $mime    = $file->getMimeType();
        $tmpPath = $file->getRealPath();

        $source = match (true) {
            str_contains($mime, 'png')  => imagecreatefrompng($tmpPath),
            str_contains($mime, 'webp') => imagecreatefromwebp($tmpPath),
            default                      => imagecreatefromjpeg($tmpPath),
        };

        $srcW = imagesx($source);
        $srcH = imagesy($source);
        $size  = min($srcW, $srcH);
        $cropX = (int) (($srcW - $size) / 2);
        $cropY = (int) (($srcH - $size) / 2);

        $target = imagecreatetruecolor(400, 400);
        imagecopyresampled($target, $source, 0, 0, $cropX, $cropY, 400, 400, $size, $size);
        imagedestroy($source);

        $storagePath = storage_path("app/public/{$dir}");
        if (! is_dir($storagePath)) {
            mkdir($storagePath, 0775, true);
        }

        $filename = $basename . '_' . time() . '.jpg';
        imagejpeg($target, "{$storagePath}/{$filename}", 90);
        imagedestroy($target);

        return "{$dir}/{$filename}";
    }
}
