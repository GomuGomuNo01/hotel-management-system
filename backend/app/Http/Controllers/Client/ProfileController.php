<?php

namespace App\Http\Controllers\Client;

use App\Helpers\SecureDocument;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\UpdateProfileRequest;
use App\Http\Requests\Client\UpdatePasswordRequest;
use App\Http\Requests\Client\UploadDocumentsRequest;
use App\Http\Requests\Shared\UploadPhotoRequest;
use App\Http\Resources\ClientResource;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/profile
     */
    public function show(Request $request): JsonResponse
    {
        return $this->success(new ClientResource($request->user()));
    }

    /**
     * PATCH /api/profile
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $client = $request->user();
        $client->fill($request->validated())->save();

        return $this->success(
            new ClientResource($client->fresh()),
            'Profil mis \u00e0 jour avec succ\u00e8s.'
        );
    }

    /**
     * POST /api/profile/photo
     * Resize to 400x400 (center-crop) before storing, so the image is always
     * crisp in every avatar size used in the UI.
     */
    public function uploadPhoto(UploadPhotoRequest $request): JsonResponse
    {
        $client = $request->user();

        // Delete previous file
        if ($client->profile_photo && ! str_starts_with($client->profile_photo, 'http')) {
            Storage::disk('public')->delete($client->profile_photo);
        }

        $file     = $request->file('photo');
        $mime     = $file->getMimeType();
        $tmpPath  = $file->getRealPath();

        // Load source image with GD
        $source = match (true) {
            str_contains($mime, 'png')  => imagecreatefrompng($tmpPath),
            str_contains($mime, 'webp') => imagecreatefromwebp($tmpPath),
            default                      => imagecreatefromjpeg($tmpPath),
        };

        $srcW = imagesx($source);
        $srcH = imagesy($source);

        // Center-crop to square then resize to 400x400
        $size     = min($srcW, $srcH);
        $cropX    = (int) (($srcW - $size) / 2);
        $cropY    = (int) (($srcH - $size) / 2);
        $target   = imagecreatetruecolor(400, 400);

        // Preserve transparency for PNG / WebP
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
        imagefilledrectangle($target, 0, 0, 399, 399, $transparent);

        imagecopyresampled($target, $source, 0, 0, $cropX, $cropY, 400, 400, $size, $size);

        imagedestroy($source);

        // Save as high-quality JPEG (smaller file, universal support)
        $dir      = "clients/{$client->id}";
        $filename = 'avatar_' . time() . '.jpg';
        $storagePath = storage_path("app/public/{$dir}");

        if (! is_dir($storagePath)) {
            mkdir($storagePath, 0775, true);
        }

        imagejpeg($target, "{$storagePath}/{$filename}", 90);
        imagedestroy($target);

        $relativePath = "{$dir}/{$filename}";
        $client->forceFill(['profile_photo' => $relativePath])->save();

        return $this->success(
            new ClientResource($client->fresh()),
            'Photo de profil mise \u00e0 jour.'
        );
    }

    /**
     * DELETE /api/profile/photo
     */
    public function deletePhoto(Request $request): JsonResponse
    {
        $client = $request->user();

        if ($client->profile_photo && ! str_starts_with($client->profile_photo, 'http')) {
            Storage::disk('public')->delete($client->profile_photo);
        }

        $client->forceFill(['profile_photo' => null])->save();

        return $this->success(new ClientResource($client->fresh()), 'Photo de profil supprim\u00e9e.');
    }

    /**
     * POST /api/profile/documents
     * Upload d'une ou plusieurs pièces d'identité (image ou PDF).
     * Les fichiers sont ajoutés à la liste existante (stockage privé,
     * consultables uniquement via les endpoints authentifiés).
     */
    public function uploadDocuments(UploadDocumentsRequest $request): JsonResponse
    {
        $client = $request->user();
        $docs   = is_array($client->id_documents) ? $client->id_documents : [];

        foreach ($request->file('documents') as $file) {
            $path = $file->store("clients/{$client->id}/documents", SecureDocument::DISK);
            // On conserve le nom d'origine pour l'affichage (le chemin reste unique).
            $docs[] = ['path' => $path, 'name' => $file->getClientOriginalName()];
        }

        $client->forceFill(['id_documents' => array_values($docs)])->save();

        return $this->success(
            new ClientResource($client->fresh()),
            'Pièce(s) d\'identité enregistrée(s).'
        );
    }

    /**
     * Liste des chemins de documents du client (gère l'ancien format string
     * et le nouveau format objet {path, name}).
     */
    private function documentPaths($client): array
    {
        return collect($client->id_documents ?? [])
            ->map(fn ($d) => is_array($d) ? ($d['path'] ?? null) : $d)
            ->filter()
            ->values()
            ->all();
    }

    /**
     * GET /api/profile/documents/view?path=...
     * Renvoie le fichier (image/PDF) en flux inline — accès restreint
     * aux documents appartenant au client authentifié.
     */
    public function viewDocument(Request $request)
    {
        $request->validate(['path' => ['required', 'string']]);

        $client = $request->user();
        $path   = (string) $request->input('path');

        if (! in_array($path, $this->documentPaths($client), true)) {
            abort(404, 'Document introuvable.');
        }

        return SecureDocument::response($path);
    }

    /**
     * DELETE /api/profile/documents
     * Supprime une pièce d'identité par son chemin.
     */
    public function deleteDocument(Request $request): JsonResponse
    {
        $request->validate(['path' => ['required', 'string']]);

        $client = $request->user();
        $target = (string) $request->input('path');
        $docs   = is_array($client->id_documents) ? $client->id_documents : [];

        if (! in_array($target, $this->documentPaths($client), true)) {
            return $this->notFound('Document introuvable.');
        }

        if (! str_starts_with($target, 'http')) {
            SecureDocument::delete($target);
        }

        $remaining = array_values(array_filter(
            $docs,
            fn ($d) => (is_array($d) ? ($d['path'] ?? null) : $d) !== $target,
        ));

        $client->forceFill(['id_documents' => $remaining])->save();

        return $this->success(new ClientResource($client->fresh()), 'Document supprimé.');
    }

    /**
     * PATCH /api/profile/password
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $client = $request->user();

        if ($client->password && ! Hash::check($request->string('current_password'), $client->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Mot de passe actuel incorrect.'],
            ]);
        }

        $client->forceFill(['password' => Hash::make($request->string('password'))])->save();

        $current = $request->user()->currentAccessToken();
        $client->tokens()->where('id', '!=', $current?->id)->delete();

        return $this->success(message: 'Mot de passe mis \u00e0 jour.');
    }

    /**
     * GET /api/profile/data-export
     * RGPD \u2014 droit d'acc\u00e8s / portabilit\u00e9 : renvoie l'int\u00e9gralit\u00e9 des donn\u00e9es
     * personnelles du client sous forme de fichier JSON t\u00e9l\u00e9chargeable.
     */
    public function dataExport(Request $request): JsonResponse
    {
        $client = $request->user();

        $payload = [
            'export_genere_le' => now()->toIso8601String(),
            'profil' => [
                'id'                      => $client->id,
                'first_name'              => $client->first_name,
                'last_name'               => $client->last_name,
                'email'                   => $client->email,
                'phone'                   => $client->phone,
                'date_of_birth'           => optional($client->date_of_birth)->toDateString(),
                'gender'                  => $client->gender,
                'address_line'            => $client->address_line,
                'city'                    => $client->city,
                'postal_code'             => $client->postal_code,
                'country'                 => $client->country,
                'id_document_type'        => $client->id_document_type,
                'emergency_contact_name'  => $client->emergency_contact_name,
                'emergency_contact_phone' => $client->emergency_contact_phone,
                'provider'                => $client->provider,
                'inscrit_le'              => optional($client->created_at)->toIso8601String(),
            ],
            'pieces_identite' => collect($client->id_documents ?? [])
                ->map(fn ($d) => ['name' => is_array($d) ? ($d['name'] ?? null) : null])
                ->values(),
            'reservations' => $client->reservations()->with('room:id,room_number,room_type')->get()
                ->map(fn ($r) => [
                    'id'             => $r->id,
                    'chambre'        => $r->room?->room_number,
                    'type'           => $r->room?->room_type,
                    'check_in_date'  => optional($r->check_in_date)->toDateString(),
                    'check_out_date' => optional($r->check_out_date)->toDateString(),
                    'statut'         => $r->status,
                    'montant_total'  => (float) $r->total_amount,
                    'cree_le'        => optional($r->created_at)->toIso8601String(),
                ]),
            'paiements' => $client->payments()->get()
                ->map(fn ($p) => [
                    'id'         => $p->id,
                    'montant'    => (float) $p->amount,
                    'devise'     => $p->currency,
                    'moyen'      => $p->provider,
                    'statut'     => $p->status,
                    'reference'  => $p->transaction_reference,
                    'confirme_le'=> optional($p->confirmed_at)->toIso8601String(),
                ]),
            'remboursements' => $client->refunds()->get()
                ->map(fn ($r) => [
                    'id'      => $r->id,
                    'montant' => (float) $r->amount,
                    'statut'  => $r->status,
                    'cree_le' => optional($r->created_at)->toIso8601String(),
                ]),
            'avis' => \App\Models\Review::where('client_id', $client->id)->get()
                ->map(fn ($r) => [
                    'id'      => $r->id,
                    'note'    => $r->rating,
                    'comment' => $r->comment,
                    'cree_le' => optional($r->created_at)->toIso8601String(),
                ]),
            'reclamations' => \App\Models\Complaint::where('client_id', $client->id)->get()
                ->map(fn ($c) => [
                    'id'        => $c->id,
                    'categorie' => $c->category,
                    'sujet'     => $c->custom_subject,
                    'message'   => $c->message,
                    'statut'    => $c->status,
                    'cree_le'   => optional($c->created_at)->toIso8601String(),
                ]),
        ];

        return response()->json($payload, 200, [
            'Content-Disposition' => 'attachment; filename="mes-donnees-'.$client->id.'.json"',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    /**
     * DELETE /api/profile
     * RGPD \u2014 droit \u00e0 l'oubli : anonymise les donn\u00e9es personnelles du client puis
     * soft-delete le compte. Les \u00e9critures (r\u00e9servations, paiements) sont
     * conserv\u00e9es mais d\u00e9tach\u00e9es de toute donn\u00e9e personnelle, pour respecter \u00e0 la
     * fois le droit \u00e0 l'oubli et les obligations de conservation comptable.
     */
    public function destroyAccount(Request $request): JsonResponse
    {
        $client = $request->user();

        // Confirmation par mot de passe (sauf comptes OAuth sans mot de passe).
        if ($client->password) {
            $request->validate(['current_password' => ['required', 'string']]);
            if (! Hash::check($request->string('current_password'), $client->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Mot de passe incorrect.'],
                ]);
            }
        }

        // 1. Supprimer les fichiers personnels (pi\u00e8ces d'identit\u00e9 + photo).
        foreach ($client->id_documents ?? [] as $doc) {
            $path = is_array($doc) ? ($doc['path'] ?? null) : $doc;
            if ($path) {
                SecureDocument::delete($path);
            }
        }
        if ($client->profile_photo && ! str_starts_with($client->profile_photo, 'http')) {
            Storage::disk('public')->delete($client->profile_photo);
        }

        // 2. Anonymiser les donn\u00e9es personnelles (PII) \u2014 conserve l'id pour les FK.
        $client->forceFill([
            'first_name'              => 'Compte',
            'last_name'               => 'supprim\u00e9',
            'email'                   => 'deleted+'.$client->id.'-'.\Illuminate\Support\Str::random(8).'@anonymized.invalid',
            'phone'                   => null,
            'date_of_birth'           => null,
            'gender'                  => null,
            'address_line'            => null,
            'city'                    => null,
            'postal_code'             => null,
            'country'                 => null,
            'id_document_type'        => null,
            'id_document_number'      => null,
            'id_documents'            => null,
            'emergency_contact_name'  => null,
            'emergency_contact_phone' => null,
            'profile_photo'           => null,
            'preferences'             => null,
            'password'                => null,
            'provider_id'             => null,
            'anonymized_at'           => now(),
        ])->save();

        // 3. R\u00e9voquer tous les jetons d'acc\u00e8s.
        $client->tokens()->delete();

        // 4. Soft-delete : le compte devient inaccessible (login impossible).
        $client->delete();

        return $this->success(message: 'Votre compte et vos donn\u00e9es personnelles ont \u00e9t\u00e9 supprim\u00e9s.');
    }
}
