<?php

namespace App\Helpers;

/**
 * PhotoUrl — source unique de vérité pour l'URL d'une photo de profil.
 *
 * Le chemin stocké en base est relatif au disque public (« profiles/x.jpg »),
 * sauf pour les comptes Google dont l'avatar est déjà une URL absolue.
 * Toute sérialisation exposant une photo à la SPA DOIT passer par ici : cette
 * logique était recopiée dans quatre fichiers, et l'un d'eux (OwnerResource)
 * avait fini par oublier le champ, laissant l'en-tête du propriétaire sans
 * photo alors que sa page de profil l'affichait.
 */
class PhotoUrl
{
    /**
     * URL absolue affichable, ou null si aucune photo n'est enregistrée.
     */
    public static function make(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return str_starts_with($path, 'http')
            ? $path
            : asset('storage/'.ltrim($path, '/'));
    }
}
