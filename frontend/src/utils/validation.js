/**
 * Fragments Zod, miroir des règles de validation du backend.
 *
 * Objectif : prévenir l'utilisateur pendant la saisie plutôt qu'après la
 * soumission. Chaque règle ci-dessous double une contrainte réelle des Form
 * Requests (app/Http/Requests/**) ; un formulaire qui les utilise ne peut plus
 * partir en 422 pour un motif que le navigateur pouvait détecter.
 *
 * ⚠️ Ces règles ne remplacent pas la validation serveur (seule autorité) :
 *    elles la reflètent. Toute modification d'un Form Request doit être
 *    répercutée ici, et inversement.
 */
import { z } from 'zod';

/** Longueurs maximales des colonnes (`max:` côté backend). */
export const MAX = {
  name:                  80,   // first_name, last_name, job_title
  fullName:             100,   // owners.full_name
  email:                150,
  phone:                 20,
  placeOfBirth:         150,
  addressLine:          200,
  city:                 100,
  idDocumentNumber:      50,
  emergencyContactName: 120,
  bio:                 2000,
  roomNumber:            20,
};

/* ─── Mot de passe ────────────────────────────────────────────────
   Miroir de Password::min(8)->letters()->mixedCase()->numbers()->symbols().
   Cette règle était recopiée dans cinq formulaires avec trois définitions
   différentes : trois d'entre eux laissaient passer un mot de passe que le
   backend refusait ensuite.
──────────────────────────────────────────────────────────────────── */
export const passwordRule = z
  .string()
  .min(8, 'Au moins 8 caractères')
  .regex(/[A-Z]/,        'Au moins une majuscule')
  .regex(/[a-z]/,        'Au moins une minuscule')
  .regex(/[0-9]/,        'Au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial');

/** Ajoute la concordance mot de passe / confirmation à un schéma. */
export const withPasswordConfirmation = (schema) =>
  schema.refine((d) => d.password === d.password_confirmation, {
    path:    ['password_confirmation'],
    message: 'Les mots de passe ne correspondent pas.',
  });

/* ─── Champs texte ────────────────────────────────────────────────── */

/** Champ obligatoire, borné à la longueur de la colonne. */
export const requiredText = (max, message) =>
  z.string().min(1, message).max(max, `Maximum ${max} caractères.`);

/** Champ facultatif : vide accepté, sinon borné. */
export const optionalText = (max) =>
  z.string().max(max, `Maximum ${max} caractères.`).optional().or(z.literal(''));

/** Adresse e-mail — `email` + `max:150`. */
export const emailRule = z
  .string()
  .min(1, 'Adresse e-mail requise')
  .email('Adresse e-mail invalide')
  .max(MAX.email, `Maximum ${MAX.email} caractères.`);

/* ─── Téléphone ───────────────────────────────────────────────────
   PhoneInputWithCode produit « +225 07 00 00 00 00 ». Un champ effacé après
   saisie retombe sur « +225 » seul : non vide, mais refusé par le regex
   backend. On le traite donc comme un numéro incomplet, pas comme un vide.
──────────────────────────────────────────────────────────────────── */
const PHONE_DIGITS = 10; // Côte d'Ivoire

/** Chiffres significatifs, indicatif exclu. */
const localDigits = (value) =>
  String(value ?? '').replace(/^\+?225/, '').replace(/\D/g, '');

/** Numéro vide ou non renseigné (« », « +225 »). */
const isBlankPhone = (value) => localDigits(value).length === 0;

const PHONE_MESSAGE = `Le numéro doit comporter ${PHONE_DIGITS} chiffres.`;

/** Téléphone obligatoire. */
export const phoneRule = z
  .string()
  .refine((v) => !isBlankPhone(v), 'Numéro de téléphone requis')
  .refine((v) => isBlankPhone(v) || localDigits(v).length === PHONE_DIGITS, PHONE_MESSAGE);

/** Téléphone facultatif : vide accepté, sinon complet. */
export const optionalPhoneRule = z
  .string()
  .refine((v) => isBlankPhone(v) || localDigits(v).length === PHONE_DIGITS, PHONE_MESSAGE)
  .optional()
  .or(z.literal(''));

/**
 * Normalise un téléphone avant envoi : « +225 » seul devient une chaîne vide,
 * pour que le backend le reçoive comme « non renseigné » et non comme invalide.
 */
export const cleanPhone = (value) => (isBlankPhone(value) ? '' : String(value).trim());

/* ─── Nombres ─────────────────────────────────────────────────────── */

/**
 * Adapte un schéma numérique à un `<input type="number">`.
 *
 * `z.coerce.number()` convertirait une saisie vide en `0` : un prix laissé
 * vide partirait à 0 F CFA au lieu d'être signalé comme obligatoire. On
 * ramène donc le vide à `undefined` pour que la règle `required` s'applique.
 */
export const numberInput = (schema) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    schema,
  );

/* ─── Dates ───────────────────────────────────────────────────────── */

/** Date du jour au format `yyyy-mm-dd` — borne `max` des champs date. */
export const today = () => new Date().toISOString().split('T')[0];

/** Date facultative, obligatoirement passée (`before:today` côté backend). */
export const pastDateRule = z
  .string()
  .refine((v) => !v || v < today(), 'La date doit être antérieure à aujourd\'hui.')
  .optional()
  .or(z.literal(''));
