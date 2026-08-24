<?php

/*
|--------------------------------------------------------------------------
| Messages de validation — français
|--------------------------------------------------------------------------
|
| L'application est intégralement en français : sans ce fichier, toute règle
| de validation non couverte par un `messages()` de Form Request remonte le
| message anglais par défaut de Laravel jusqu'à l'utilisateur
| (« The id_documents.0 field must not be greater than 5120 kilobytes. »).
|
| Le tableau `attributes` en fin de fichier donne à chaque champ son libellé
| métier : c'est lui qui remplace `:attribute` dans les messages ci-dessous.
|
*/

return [

    'accepted'             => 'Le champ :attribute doit être accepté.',
    'accepted_if'          => 'Le champ :attribute doit être accepté quand :other vaut :value.',
    'active_url'           => "Le champ :attribute n'est pas une URL valide.",
    'after'                => 'Le champ :attribute doit être une date postérieure au :date.',
    'after_or_equal'       => 'Le champ :attribute doit être une date postérieure ou égale au :date.',
    'alpha'                => 'Le champ :attribute ne doit contenir que des lettres.',
    'alpha_dash'           => 'Le champ :attribute ne doit contenir que des lettres, des chiffres, des tirets et des underscores.',
    'alpha_num'            => 'Le champ :attribute ne doit contenir que des lettres et des chiffres.',
    'any_of'               => "Le champ :attribute n'est pas valide.",
    'array'                => 'Le champ :attribute doit être un tableau.',
    'ascii'                => 'Le champ :attribute ne doit contenir que des caractères alphanumériques et des symboles ASCII.',
    'before'               => 'Le champ :attribute doit être une date antérieure au :date.',
    'before_or_equal'      => 'Le champ :attribute doit être une date antérieure ou égale au :date.',

    'between' => [
        'array'   => 'Le champ :attribute doit contenir entre :min et :max éléments.',
        'file'    => 'Le champ :attribute doit faire entre :min et :max kilo-octets.',
        'numeric' => 'Le champ :attribute doit être compris entre :min et :max.',
        'string'  => 'Le champ :attribute doit contenir entre :min et :max caractères.',
    ],

    'boolean'              => 'Le champ :attribute doit être vrai ou faux.',
    'can'                  => 'Le champ :attribute contient une valeur non autorisée.',
    'confirmed'            => 'La confirmation du champ :attribute ne correspond pas.',
    'contains'             => 'Le champ :attribute ne contient pas une valeur requise.',
    'current_password'     => 'Le mot de passe est incorrect.',
    'date'                 => "Le champ :attribute n'est pas une date valide.",
    'date_equals'          => 'Le champ :attribute doit être une date égale au :date.',
    'date_format'          => 'Le champ :attribute ne correspond pas au format :format.',
    'decimal'              => 'Le champ :attribute doit comporter :decimal décimales.',
    'declined'             => 'Le champ :attribute doit être refusé.',
    'declined_if'          => 'Le champ :attribute doit être refusé quand :other vaut :value.',
    'different'            => 'Les champs :attribute et :other doivent être différents.',
    'digits'               => 'Le champ :attribute doit contenir :digits chiffres.',
    'digits_between'       => 'Le champ :attribute doit contenir entre :min et :max chiffres.',
    'dimensions'           => "Le champ :attribute n'a pas des dimensions d'image valides.",
    'distinct'             => 'Le champ :attribute contient une valeur en double.',
    'doesnt_contain'       => 'Le champ :attribute ne doit contenir aucune des valeurs suivantes : :values.',
    'doesnt_end_with'      => 'Le champ :attribute ne doit pas se terminer par une des valeurs suivantes : :values.',
    'doesnt_start_with'    => 'Le champ :attribute ne doit pas commencer par une des valeurs suivantes : :values.',
    'email'                => "Le champ :attribute doit être une adresse e-mail valide.",
    'encoding'             => "Le champ :attribute doit utiliser l'encodage :encoding.",
    'ends_with'            => 'Le champ :attribute doit se terminer par une des valeurs suivantes : :values.',
    'enum'                 => 'La valeur sélectionnée pour :attribute est invalide.',
    'exists'               => 'La valeur sélectionnée pour :attribute est invalide.',
    'extensions'           => 'Le champ :attribute doit avoir une des extensions suivantes : :values.',
    'file'                 => 'Le champ :attribute doit être un fichier.',
    'filled'               => 'Le champ :attribute doit avoir une valeur.',

    'gt' => [
        'array'   => 'Le champ :attribute doit contenir plus de :value éléments.',
        'file'    => 'Le champ :attribute doit faire plus de :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être supérieur à :value.',
        'string'  => 'Le champ :attribute doit contenir plus de :value caractères.',
    ],

    'gte' => [
        'array'   => 'Le champ :attribute doit contenir au moins :value éléments.',
        'file'    => 'Le champ :attribute doit faire au moins :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être supérieur ou égal à :value.',
        'string'  => 'Le champ :attribute doit contenir au moins :value caractères.',
    ],

    'hex_color'            => 'Le champ :attribute doit être une couleur hexadécimale valide.',
    'image'                => 'Le champ :attribute doit être une image.',
    'in'                   => 'La valeur sélectionnée pour :attribute est invalide.',
    'in_array'             => "Le champ :attribute n'existe pas dans :other.",
    'in_array_keys'        => 'Le champ :attribute doit contenir au moins une des clés suivantes : :values.',
    'integer'              => 'Le champ :attribute doit être un nombre entier.',
    'ip'                   => 'Le champ :attribute doit être une adresse IP valide.',
    'ipv4'                 => 'Le champ :attribute doit être une adresse IPv4 valide.',
    'ipv6'                 => 'Le champ :attribute doit être une adresse IPv6 valide.',
    'json'                 => 'Le champ :attribute doit être un document JSON valide.',
    'list'                 => 'Le champ :attribute doit être une liste.',
    'lowercase'            => 'Le champ :attribute doit être en minuscules.',

    'lt' => [
        'array'   => 'Le champ :attribute doit contenir moins de :value éléments.',
        'file'    => 'Le champ :attribute doit faire moins de :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être inférieur à :value.',
        'string'  => 'Le champ :attribute doit contenir moins de :value caractères.',
    ],

    'lte' => [
        'array'   => 'Le champ :attribute doit contenir au plus :value éléments.',
        'file'    => 'Le champ :attribute doit faire au plus :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être inférieur ou égal à :value.',
        'string'  => 'Le champ :attribute doit contenir au plus :value caractères.',
    ],

    'mac_address'          => 'Le champ :attribute doit être une adresse MAC valide.',

    'max' => [
        'array'   => 'Le champ :attribute ne doit pas contenir plus de :max éléments.',
        'file'    => 'Le fichier :attribute ne doit pas dépasser :max kilo-octets.',
        'numeric' => 'Le champ :attribute ne doit pas être supérieur à :max.',
        'string'  => 'Le champ :attribute ne doit pas dépasser :max caractères.',
    ],

    'max_digits'           => 'Le champ :attribute ne doit pas contenir plus de :max chiffres.',
    'mimes'                => 'Le champ :attribute doit être un fichier de type : :values.',
    'mimetypes'            => 'Le champ :attribute doit être un fichier de type : :values.',

    'min' => [
        'array'   => 'Le champ :attribute doit contenir au moins :min éléments.',
        'file'    => 'Le fichier :attribute doit faire au moins :min kilo-octets.',
        'numeric' => 'Le champ :attribute doit être au moins :min.',
        'string'  => 'Le champ :attribute doit contenir au moins :min caractères.',
    ],

    'min_digits'           => 'Le champ :attribute doit contenir au moins :min chiffres.',
    'missing'              => 'Le champ :attribute doit être absent.',
    'missing_if'           => 'Le champ :attribute doit être absent quand :other vaut :value.',
    'missing_unless'       => 'Le champ :attribute doit être absent sauf si :other vaut :value.',
    'missing_with'         => 'Le champ :attribute doit être absent quand :values est présent.',
    'missing_with_all'     => 'Le champ :attribute doit être absent quand :values sont présents.',
    'multiple_of'          => 'Le champ :attribute doit être un multiple de :value.',
    'not_in'               => 'La valeur sélectionnée pour :attribute est invalide.',
    'not_regex'            => "Le format du champ :attribute n'est pas valide.",
    'numeric'              => 'Le champ :attribute doit être un nombre.',
    'password'             => [
        'letters'       => 'Le champ :attribute doit contenir au moins une lettre.',
        'mixed'         => 'Le champ :attribute doit contenir au moins une majuscule et une minuscule.',
        'numbers'       => 'Le champ :attribute doit contenir au moins un chiffre.',
        'symbols'       => 'Le champ :attribute doit contenir au moins un symbole.',
        'uncompromised' => 'Le champ :attribute est apparu dans une fuite de données. Choisissez-en un autre.',
    ],
    'present'              => 'Le champ :attribute doit être présent.',
    'present_if'           => 'Le champ :attribute doit être présent quand :other vaut :value.',
    'present_unless'       => 'Le champ :attribute doit être présent sauf si :other vaut :value.',
    'present_with'         => 'Le champ :attribute doit être présent quand :values est présent.',
    'present_with_all'     => 'Le champ :attribute doit être présent quand :values sont présents.',
    'prohibited'           => 'Le champ :attribute est interdit.',
    'prohibited_if'        => 'Le champ :attribute est interdit quand :other vaut :value.',
    'prohibited_if_accepted' => 'Le champ :attribute est interdit quand :other est accepté.',
    'prohibited_if_declined' => 'Le champ :attribute est interdit quand :other est refusé.',
    'prohibited_unless'    => 'Le champ :attribute est interdit sauf si :other fait partie de :values.',
    'prohibits'            => 'Le champ :attribute interdit la présence de :other.',
    'regex'                => "Le format du champ :attribute n'est pas valide.",
    'required'             => 'Le champ :attribute est obligatoire.',
    'required_array_keys'  => 'Le champ :attribute doit contenir les clés suivantes : :values.',
    'required_if'          => 'Le champ :attribute est obligatoire quand :other vaut :value.',
    'required_if_accepted' => 'Le champ :attribute est obligatoire quand :other est accepté.',
    'required_if_declined' => 'Le champ :attribute est obligatoire quand :other est refusé.',
    'required_unless'      => 'Le champ :attribute est obligatoire sauf si :other fait partie de :values.',
    'required_with'        => 'Le champ :attribute est obligatoire quand :values est présent.',
    'required_with_all'    => 'Le champ :attribute est obligatoire quand :values sont présents.',
    'required_without'     => "Le champ :attribute est obligatoire quand :values n'est pas présent.",
    'required_without_all' => "Le champ :attribute est obligatoire quand aucun de :values n'est présent.",
    'same'                 => 'Les champs :attribute et :other doivent être identiques.',

    'size' => [
        'array'   => 'Le champ :attribute doit contenir :size éléments.',
        'file'    => 'Le fichier :attribute doit faire :size kilo-octets.',
        'numeric' => 'Le champ :attribute doit être égal à :size.',
        'string'  => 'Le champ :attribute doit contenir :size caractères.',
    ],

    'starts_with'          => 'Le champ :attribute doit commencer par une des valeurs suivantes : :values.',
    'string'               => 'Le champ :attribute doit être une chaîne de caractères.',
    'timezone'             => 'Le champ :attribute doit être un fuseau horaire valide.',
    'ulid'                 => 'Le champ :attribute doit être un ULID valide.',
    'unique'               => 'Cette valeur de :attribute est déjà utilisée.',
    'uploaded'             => "L'envoi du fichier :attribute a échoué. Vérifiez sa taille et réessayez.",
    'uppercase'            => 'Le champ :attribute doit être en majuscules.',
    'url'                  => 'Le champ :attribute doit être une URL valide.',
    'uuid'                 => 'Le champ :attribute doit être un UUID valide.',

    /*
    |--------------------------------------------------------------------------
    | Messages personnalisés par champ
    |--------------------------------------------------------------------------
    */

    'custom' => [
        'password' => [
            'min' => 'Le mot de passe doit contenir au moins :min caractères.',
        ],
        'current_password' => [
            'required' => 'Veuillez saisir votre mot de passe actuel.',
        ],

        // Tailles de fichiers exprimées en Mo — « 5120 kilo-octets » ne parle
        // à personne. Doivent rester alignées sur les règles `max:` des Form
        // Requests et sur frontend/src/utils/upload.js.
        'id_documents.*' => [
            'max'   => 'Chaque document justificatif ne doit pas dépasser 5 Mo.',
            'mimes' => 'Formats acceptés pour les documents : PDF, JPG, PNG ou WebP.',
        ],
        'documents.*' => [
            'max'   => "Chaque pièce d'identité ne doit pas dépasser 25 Mo.",
            'mimes' => "Formats acceptés pour les pièces d'identité : JPG, PNG, WebP ou PDF.",
        ],
        'images.*' => [
            'max'   => 'Chaque photo de chambre ne doit pas dépasser 5 Mo.',
            'mimes' => 'Formats acceptés pour les photos : JPEG, PNG, JPG ou WebP.',
        ],
        'photo' => [
            'max'   => 'La photo ne doit pas dépasser 4 Mo.',
            'mimes' => 'Formats acceptés pour la photo : JPEG, PNG, JPG ou WebP.',
        ],
        'identity_photo' => [
            'max'   => 'La photo de profil ne doit pas dépasser 4 Mo.',
            'mimes' => 'Formats acceptés pour la photo de profil : JPG, PNG ou WebP.',
        ],
        'id_document_path' => [
            'max'   => 'La pièce jointe ne doit pas dépasser 5 Mo.',
            'mimes' => 'Formats acceptés pour la pièce jointe : PDF, JPG, PNG ou WebP.',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Libellés métier des champs
    |--------------------------------------------------------------------------
    |
    | Remplace :attribute. Sans cette table, l'utilisateur lit le nom technique
    | de la colonne (« id_documents.0 ») au lieu du libellé du formulaire.
    |
    */

    'attributes' => [
        // Identité
        'first_name'              => 'prénom',
        'last_name'               => 'nom',
        'full_name'               => 'nom complet',
        'date_of_birth'           => 'date de naissance',
        'place_of_birth'          => 'lieu de naissance',
        'gender'                  => 'genre',
        'bio'                     => 'biographie',

        // Contact & adresse
        'email'                   => 'adresse e-mail',
        'phone'                   => 'numéro de téléphone',
        'phone_number'            => 'numéro de téléphone',
        'address_line'            => 'adresse',
        'city'                    => 'ville',
        'country'                 => 'pays',
        'postal_code'             => 'code postal',
        'emergency_contact_name'  => "nom du contact d'urgence",
        'emergency_contact_phone' => "téléphone du contact d'urgence",

        // Authentification
        'password'                => 'mot de passe',
        'password_confirmation'   => 'confirmation du mot de passe',
        'current_password'        => 'mot de passe actuel',
        'remember'                => 'se souvenir de moi',
        'provider'                => 'fournisseur',
        'token'                   => 'lien de réinitialisation',
        'code'                    => 'code de connexion',

        // Filtres & exports
        'from'                    => 'date de début',
        'days'                    => 'nombre de jours',
        'outcome'                 => 'résultat',
        'path'                    => 'fichier',

        // Pièces d'identité & fichiers
        'id_document_type'        => 'type de document',
        'id_document_number'      => 'numéro du document',
        'id_document_path'        => 'pièce jointe',
        'id_documents'            => 'documents justificatifs',
        'id_documents.*'          => 'document justificatif',
        'documents'               => "pièces d'identité",
        'documents.*'             => "pièce d'identité",
        'existing_documents'      => 'documents conservés',
        'identity_photo'          => 'photo de profil',
        'photo'                   => 'photo',
        'images'                  => 'photos',
        'images.*'                => 'photo',

        // Chambres
        'room_id'                 => 'chambre',
        'room_number'             => 'numéro de chambre',
        'room_type'               => 'type de chambre',
        'price_per_night'         => 'prix par nuit',
        'capacity'                => 'capacité',
        'description'             => 'description',
        'amenities'               => 'équipements',
        'amenities.*'             => 'équipement',
        'status'                  => 'statut',
        'housekeeping_status'     => 'état du ménage',

        // Réservations & paiements
        'reservation_id'          => 'réservation',
        'check_in_date'           => "date d'arrivée",
        'check_out_date'          => 'date de départ',
        'payment_plan'            => 'formule de paiement',
        'notes'                   => 'notes',

        // Avis & réclamations
        'rating'                  => 'note',
        'comment'                 => 'commentaire',
        'category'                => 'catégorie',
        'message'                 => 'message',
        'response'                => 'réponse',
        'custom_subject'          => 'objet',

        // Comptes administrateurs
        'role'                    => 'rôle',
        'permissions'             => 'permissions',
        'permissions.*'           => 'permission',
        'job_title'               => 'poste',
        'hired_at'                => "date d'embauche",

        // Préférences
        'preferences'             => 'préférences',
        'preferred_language'      => 'langue préférée',
    ],

];
