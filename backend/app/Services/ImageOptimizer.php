<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Optimisation des images à l'upload.
 *
 * Sans traitement, une photo de chambre est stockée telle que fournie par
 * l'admin : la validation autorise jusqu'à 5 Mo, et ce fichier brut est ensuite
 * servi à chaque visiteur. Un appareil photo ou un smartphone produit
 * couramment du 4000x3000 pour un affichage qui ne dépasse jamais ~1600 px.
 *
 * On redimensionne donc à la volée et on convertit en WebP, nettement plus
 * compact que JPEG à qualité perçue égale. Le gain typique va de 5 Mo à
 * ~150-250 Ko, soit un ordre de grandeur sur le temps de chargement.
 *
 * Implémenté avec GD (extension standard, déjà présente) : aucune dépendance
 * Composer supplémentaire. Si GD ou WebP venait à manquer, on retombe
 * proprement sur le stockage du fichier d'origine.
 */
class ImageOptimizer
{
    /** Largeur/hauteur maximale conservée pour une image plein écran. */
    public const MAX_DIMENSION = 1600;

    /** Qualité WebP — 82 est le palier au-delà duquel le gain visuel est nul. */
    public const WEBP_QUALITY = 82;

    /**
     * Stocke une image optimisée et renvoie son chemin relatif sur le disque.
     *
     * @param  string  $directory  dossier de destination (ex. « rooms »)
     * @param  string  $disk       disque Laravel (ex. « public »)
     * @return string  chemin relatif du fichier stocké
     */
    public function store(UploadedFile $file, string $directory, string $disk = 'public'): string
    {
        if (! $this->canProcess()) {
            return $file->store($directory, $disk);
        }

        $image = $this->read($file);

        if ($image === null) {
            return $file->store($directory, $disk);
        }

        $resized = $this->resizeWithinBounds($image);

        ob_start();
        imagewebp($resized, null, self::WEBP_QUALITY);
        $binary = (string) ob_get_clean();

        imagedestroy($resized);
        if ($resized !== $image) {
            imagedestroy($image);
        }

        // Un WebP plus lourd que l'original n'a pas d'intérêt (petites images
        // déjà compressées) : on conserve alors le fichier d'origine.
        if ($binary === '' || strlen($binary) >= $file->getSize()) {
            return $file->store($directory, $disk);
        }

        $path = rtrim($directory, '/') . '/' . Str::random(40) . '.webp';
        Storage::disk($disk)->put($path, $binary);

        return $path;
    }

    /** GD disponible avec encodage WebP ? */
    private function canProcess(): bool
    {
        return extension_loaded('gd') && function_exists('imagewebp');
    }

    /** Décode le fichier uploadé en ressource GD, ou null si le format échappe à GD. */
    private function read(UploadedFile $file): ?\GdImage
    {
        $contents = @file_get_contents($file->getRealPath());

        if ($contents === false) {
            return null;
        }

        $image = @imagecreatefromstring($contents);

        return $image === false ? null : $image;
    }

    /**
     * Réduit l'image pour que son plus grand côté tienne dans MAX_DIMENSION.
     * Une image déjà plus petite est renvoyée telle quelle (pas d'agrandissement,
     * qui ne ferait qu'alourdir le fichier sans gain de qualité).
     */
    private function resizeWithinBounds(\GdImage $image): \GdImage
    {
        $width  = imagesx($image);
        $height = imagesy($image);
        $longest = max($width, $height);

        if ($longest <= self::MAX_DIMENSION) {
            return $image;
        }

        $ratio     = self::MAX_DIMENSION / $longest;
        $newWidth  = max(1, (int) round($width * $ratio));
        $newHeight = max(1, (int) round($height * $ratio));

        $resized = imagecreatetruecolor($newWidth, $newHeight);

        // Préserve la transparence des PNG convertis en WebP.
        imagealphablending($resized, false);
        imagesavealpha($resized, true);

        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        return $resized;
    }
}
