<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * L'application est entièrement en français : aucun message de validation
 * anglais ne doit atteindre l'utilisateur.
 *
 * Ces tests verrouillent la locale et lang/fr/validation.php — sans eux, un
 * APP_LOCALE remis à « en » ou un fichier de langue supprimé repasserait la
 * SPA en anglais sans que rien n'échoue.
 */
class ValidationLocaleTest extends TestCase
{
    /** La locale applicative est le français. */
    public function test_application_locale_is_french(): void
    {
        $this->assertSame('fr', app()->getLocale());
    }

    /** Les règles courantes produisent un message français. */
    public function test_common_rules_are_translated(): void
    {
        $validator = Validator::make(
            ['email' => 'pas-un-email', 'rating' => 9],
            [
                'first_name'    => ['required'],
                'email'         => ['email'],
                'rating'        => ['integer', 'between:1,5'],
                'check_in_date' => ['required', 'date'],
            ]
        );

        $messages = $validator->errors()->all();

        foreach ($messages as $message) {
            $this->assertStringNotContainsString('The ', $message, "Message non traduit : {$message}");
            $this->assertStringNotContainsString(' field ', $message, "Message non traduit : {$message}");
        }

        $this->assertContains('Le champ prénom est obligatoire.', $messages);
        $this->assertContains("Le champ date d'arrivée est obligatoire.", $messages);
    }

    /** Les noms de champs sont remplacés par leur libellé métier. */
    public function test_field_names_use_business_labels(): void
    {
        $validator = Validator::make([], ['price_per_night' => ['required'], 'room_number' => ['required']]);

        $this->assertContains('Le champ prix par nuit est obligatoire.', $validator->errors()->all());
        $this->assertContains('Le champ numéro de chambre est obligatoire.', $validator->errors()->all());
    }

    /**
     * Les limites de taille de fichier s'expriment en Mo, pas en kilo-octets.
     * C'est le message que l'utilisateur voyait en anglais et en Ko.
     */
    public function test_file_size_limits_are_expressed_in_megabytes(): void
    {
        $file = UploadedFile::fake()->create('PASSEPORT.pdf', 8500, 'application/pdf');

        $validator = Validator::make(
            ['id_documents' => [$file], 'identity_photo' => $file],
            [
                'id_documents.*' => ['file', 'max:5120'],
                'identity_photo' => ['file', 'max:4096'],
            ]
        );

        $messages = $validator->errors()->all();

        $this->assertContains('Chaque document justificatif ne doit pas dépasser 5 Mo.', $messages);
        $this->assertContains('La photo de profil ne doit pas dépasser 4 Mo.', $messages);
    }
}
