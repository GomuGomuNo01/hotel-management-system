<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * SecureDocument — accès unifié aux pièces d'identité.
 *
 * Les nouveaux documents sont stockés sur le disque "private"
 * (storage/app/private, non exposé par URL). Les anciens fichiers peuvent
 * encore résider sur le disque "public" tant que la migration
 * `documents:move-to-private` n'a pas été exécutée : toutes les lectures et
 * suppressions passent donc par cette classe, qui cherche d'abord en privé
 * puis se replie sur le public.
 */
class SecureDocument
{
    /** Disque de stockage des nouveaux documents. */
    public const DISK = 'private';

    /**
     * Disque où réside réellement le fichier (private prioritaire,
     * repli public pour les anciens fichiers), ou null s'il est introuvable.
     */
    public static function diskFor(string $path): ?string
    {
        if (Storage::disk(self::DISK)->exists($path)) {
            return self::DISK;
        }

        if (Storage::disk('public')->exists($path)) {
            return 'public';
        }

        return null;
    }

    public static function exists(string $path): bool
    {
        return self::diskFor($path) !== null;
    }

    /**
     * Flux du document, ou 404 s'il est introuvable.
     *
     * Servi en « attachment » (téléchargement) : un fichier téléversé
     * malveillant (PDF/HTML/SVG) ne peut jamais s'exécuter dans l'origine de
     * l'API. Le SPA récupère de toute façon le document en blob, donc l'entête
     * Content-Disposition n'a aucun impact sur son affichage dans le viewer.
     */
    public static function response(string $path): StreamedResponse
    {
        $disk = self::diskFor($path);

        if ($disk === null) {
            abort(404, 'Document introuvable.');
        }

        return Storage::disk($disk)->download($path, basename($path), [
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Supprime le fichier quel que soit le disque où il réside.
     */
    public static function delete(string $path): void
    {
        Storage::disk(self::DISK)->delete($path);
        Storage::disk('public')->delete($path);
    }
}
