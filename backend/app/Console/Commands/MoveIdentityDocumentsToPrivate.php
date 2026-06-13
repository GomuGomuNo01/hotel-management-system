<?php

namespace App\Console\Commands;

use App\Helpers\SecureDocument;
use App\Models\Admin;
use App\Models\Client;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Déplace les pièces d'identité existantes du disque "public"
 * (storage/app/public, accessible par URL directe) vers le disque "private".
 *
 * Idempotente : les fichiers déjà déplacés ou introuvables sont ignorés.
 *
 *   php artisan documents:move-to-private
 *   php artisan documents:move-to-private --dry-run
 */
class MoveIdentityDocumentsToPrivate extends Command
{
    protected $signature = 'documents:move-to-private {--dry-run : Lister les fichiers sans les déplacer}';

    protected $description = "Déplace les pièces d'identité (clients et admins) du disque public vers le disque privé";

    private int $moved = 0;

    private int $skipped = 0;

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        Client::query()->whereNotNull('id_documents')->each(function (Client $client) use ($dryRun) {
            foreach ($this->paths($client->id_documents) as $path) {
                $this->move($path, $dryRun);
            }
        });

        Admin::withTrashed()
            ->where(fn ($q) => $q->whereNotNull('id_documents')->orWhereNotNull('id_document_path'))
            ->each(function (Admin $admin) use ($dryRun) {
                foreach ($this->paths($admin->id_documents) as $path) {
                    $this->move($path, $dryRun);
                }
                if ($admin->id_document_path) {
                    $this->move($admin->id_document_path, $dryRun);
                }
            });

        // Balayage des orphelins : toute pièce d'identité encore présente sur le
        // disque public est mal placée (fichiers d'admins/clients supprimés dont
        // le fichier n'a jamais été nettoyé). On les rapatrie aussi en privé.
        $this->sweepPublicOrphans($dryRun);

        $verb = $dryRun ? 'à déplacer' : 'déplacé(s)';
        $this->info("{$this->moved} fichier(s) {$verb}, {$this->skipped} ignoré(s) (déjà privés ou introuvables).");

        return self::SUCCESS;
    }

    /**
     * Chemins relatifs d'une liste id_documents (ancien format string
     * ou nouveau format {path, name}), hors URLs externes.
     */
    private function paths(?array $documents): array
    {
        return collect($documents ?? [])
            ->map(fn ($d) => is_array($d) ? ($d['path'] ?? null) : $d)
            ->filter(fn ($p) => $p && ! str_starts_with($p, 'http'))
            ->values()
            ->all();
    }

    /**
     * Rapatrie en privé toute pièce d'identité encore stockée sur le disque
     * public, qu'elle soit référencée ou orpheline :
     *   - clients/{id}/documents/*
     *   - admins/{id}/document_*
     */
    private function sweepPublicOrphans(bool $dryRun): void
    {
        $public = Storage::disk('public');

        foreach ($public->directories('clients') as $clientDir) {
            foreach ($public->files("{$clientDir}/documents") as $path) {
                $this->move($path, $dryRun);
            }
        }

        foreach ($public->directories('admins') as $adminDir) {
            foreach ($public->files($adminDir) as $path) {
                if (str_contains(basename($path), 'document_')) {
                    $this->move($path, $dryRun);
                }
            }
        }
    }

    private function move(string $path, bool $dryRun): void
    {
        $public  = Storage::disk('public');
        $private = Storage::disk(SecureDocument::DISK);

        if (! $public->exists($path)) {
            $this->skipped++;

            return;
        }

        if ($dryRun) {
            $this->line("[dry-run] {$path}");
            $this->moved++;

            return;
        }

        // Déjà présent en privé (relance après échec partiel) : on supprime
        // simplement la copie publique.
        if (! $private->exists($path)) {
            $private->writeStream($path, $public->readStream($path));
        }

        $public->delete($path);
        $this->line("déplacé : {$path}");
        $this->moved++;
    }
}
