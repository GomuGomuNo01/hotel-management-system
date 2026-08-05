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
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
    public function dataExport(Request $request): Response
    {
        $client = $request->user();

        // Libellés français des valeurs codées (statuts, moyens de paiement…).
        $resStatus   = ['pending' => 'En attente', 'confirmed' => 'Confirmée', 'checked_in' => 'En séjour', 'checked_out' => 'Terminée', 'cancelled' => 'Annulée'];
        $payProvider = ['orange_ci' => 'Orange Money', 'wave_ci' => 'Wave', 'cash' => 'Espèces'];
        $payStatus   = ['success' => 'Réussi', 'failed' => 'Échoué', 'pending' => 'En attente', 'processing' => 'En cours', 'cancelled' => 'Annulé'];
        $refStatus   = ['pending' => 'En attente', 'approved' => 'Approuvé', 'rejected' => 'Refusé'];
        $cmpStatus   = ['open' => 'Ouverte', 'handled' => 'Traitée'];
        $genders     = ['male' => 'Homme', 'female' => 'Femme'];
        $docTypes    = ['national_id' => "Carte nationale d'identité", 'passport' => 'Passeport', 'residence_permit' => 'Titre de séjour'];

        $fmtDate = fn ($d) => $d ? \Illuminate\Support\Carbon::parse($d)->format('d/m/Y') : null;
        $money   = fn ($n) => number_format((float) $n, 0, ',', ' ').' FCFA';
        $dash    = fn ($v) => ($v === null || $v === '') ? '—' : $v;

        $reservations = $client->reservations()->with('room:id,room_number,room_type')->latest()->get();
        $payments     = $client->payments()->latest()->get();
        $refunds      = $client->refunds()->latest()->get();

        $data = [
            'identite' => [
                'Prénom'            => $dash($client->first_name),
                'Nom'               => $dash($client->last_name),
                'Adresse e-mail'    => $dash($client->email),
                'Téléphone'         => $dash($client->phone),
                'Date de naissance' => $dash($fmtDate($client->date_of_birth)),
                'Civilité'          => $dash($genders[$client->gender] ?? null),
                'Type de connexion' => $client->provider === 'google' ? 'Google' : 'E-mail / mot de passe',
                'Membre depuis'     => $dash(optional($client->created_at)->format('d/m/Y')),
            ],
            'urgence' => [
                'Personne à contacter' => $dash($client->emergency_contact_name),
                'Téléphone'            => $dash($client->emergency_contact_phone),
            ],
            'pieces_identite' => collect($client->id_documents ?? [])
                ->map(fn ($d) => is_array($d) ? ($d['name'] ?? 'Document') : (string) $d)
                ->values()->all(),
            'id_document_type' => $docTypes[$client->id_document_type] ?? null,
            'reservations' => $reservations
                ->map(fn ($r) => [
                    'ref'     => 'RES-'.str_pad((string) $r->id, 6, '0', STR_PAD_LEFT),
                    'chambre' => $r->room ? 'N° '.$r->room->room_number.' · '.ucfirst($r->room->room_type) : '—',
                    'sejour'  => $fmtDate($r->check_in_date).' → '.$fmtDate($r->check_out_date),
                    'statut'  => $resStatus[$r->status] ?? $r->status,
                    'montant' => $money($r->total_amount),
                ])->all(),
            // Montant cumulé de toutes les réservations listées.
            'reservations_total' => $money($reservations->sum('total_amount')),
            'paiements' => $payments
                ->map(fn ($p) => [
                    'date'      => $dash(optional($p->confirmed_at ?? $p->created_at)->format('d/m/Y')),
                    'moyen'     => $payProvider[$p->provider] ?? $p->provider,
                    'reference' => $dash($p->transaction_reference),
                    'statut'    => $payStatus[$p->status] ?? $p->status,
                    'montant'   => $money($p->amount),
                ])->all(),
            // Total réellement payé : uniquement les paiements réussis.
            'paiements_total' => $money($payments->where('status', 'success')->sum('amount')),
            'remboursements' => $refunds
                ->map(fn ($r) => [
                    'date'    => $dash(optional($r->created_at)->format('d/m/Y')),
                    'statut'  => $refStatus[$r->status] ?? $r->status,
                    'montant' => $money($r->amount),
                ])->all(),
            // Total effectivement remboursé : uniquement les remboursements approuvés.
            'remboursements_total' => $money($refunds->where('status', 'approved')->sum('amount')),
            'avis' => \App\Models\Review::where('client_id', $client->id)->latest()->get()
                ->map(fn ($r) => [
                    'date'    => $dash(optional($r->created_at)->format('d/m/Y')),
                    'note'    => $r->rating.' / 5',
                    'comment' => $dash($r->comment),
                ])->all(),
            'reclamations' => \App\Models\Complaint::where('client_id', $client->id)->latest()->get()
                ->map(fn ($c) => [
                    'date'    => $dash(optional($c->created_at)->format('d/m/Y')),
                    'sujet'   => $c->categoryLabel(),
                    'message' => $dash($c->message),
                    'statut'  => $cmpStatus[$c->status] ?? $c->status,
                ])->all(),
        ];

        $pdf = Pdf::loadView('exports.client-data', [
            'client'   => $client,
            'data'     => $data,
            'issuedAt' => now(),
        ]);

        return $pdf->download('mes-donnees-personnelles.pdf');
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

        // 5. Purger le cache serveur des t\u00e9moignages d'accueil : les avis de ce
        //    client ne doivent plus y appara\u00eetre (coh\u00e9rent avec whereHas('client')).
        \App\Http\Controllers\Public\RoomController::forgetPublicReviewsCache();

        return $this->success(message: 'Votre compte et vos donn\u00e9es personnelles ont \u00e9t\u00e9 supprim\u00e9s.');
    }
}
