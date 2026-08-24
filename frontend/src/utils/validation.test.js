import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  MAX, cleanPhone, emailRule, numberInput, optionalPhoneRule, optionalText,
  passwordRule, pastDateRule, phoneRule, requiredText,
} from './validation';

/** Raccourci : la règle accepte-t-elle cette valeur ? */
const accepts = (rule, value) => rule.safeParse(value).success;
/** Premier message d'erreur produit. */
const messageFor = (rule, value) => rule.safeParse(value).error?.issues[0]?.message;

describe('passwordRule', () => {
  it('accepte un mot de passe conforme à la politique backend', () => {
    expect(accepts(passwordRule, 'Passw0rd!')).toBe(true);
  });

  it.each([
    ['court',            'Ab1!',        'Au moins 8 caractères'],
    ['sans majuscule',   'passw0rd!',   'Au moins une majuscule'],
    ['sans minuscule',   'PASSW0RD!',   'Au moins une minuscule'],
    ['sans chiffre',     'Password!',   'Au moins un chiffre'],
    ['sans symbole',     'Password1',   'Au moins un caractère spécial'],
  ])('refuse un mot de passe %s', (_label, value, expected) => {
    expect(messageFor(passwordRule, value)).toBe(expected);
  });
});

describe('emailRule', () => {
  it('accepte une adresse valide', () => {
    expect(accepts(emailRule, 'patron@hotel.local')).toBe(true);
  });

  it('refuse une adresse malformée', () => {
    expect(messageFor(emailRule, 'pas-un-email')).toBe('Adresse e-mail invalide');
  });

  it('refuse au-delà de la longueur de colonne', () => {
    expect(accepts(emailRule, `${'a'.repeat(MAX.email)}@x.fr`)).toBe(false);
  });
});

describe('téléphone', () => {
  const complet = '+225 07 00 00 00 00';

  it('accepte un numéro complet', () => {
    expect(accepts(phoneRule, complet)).toBe(true);
    expect(accepts(optionalPhoneRule, complet)).toBe(true);
  });

  it('refuse un numéro incomplet', () => {
    expect(messageFor(phoneRule, '+225 07 00')).toBe('Le numéro doit comporter 10 chiffres.');
  });

  it('traite « +225 » seul comme un champ vide, pas comme un numéro invalide', () => {
    // Le composant PhoneInputWithCode retombe sur l'indicatif nu quand on
    // efface la saisie : le backend refusait cette valeur.
    expect(accepts(optionalPhoneRule, '+225')).toBe(true);
    expect(cleanPhone('+225')).toBe('');
  });

  it('exige une valeur quand le numéro est obligatoire', () => {
    expect(messageFor(phoneRule, '+225')).toBe('Numéro de téléphone requis');
    expect(accepts(optionalPhoneRule, '')).toBe(true);
  });

  it('conserve un numéro renseigné', () => {
    expect(cleanPhone(complet)).toBe(complet);
  });
});

describe('champs texte', () => {
  it('exige une valeur et respecte la borne', () => {
    const rule = requiredText(MAX.name, 'Prénom requis');
    expect(messageFor(rule, '')).toBe('Prénom requis');
    expect(messageFor(rule, 'a'.repeat(MAX.name + 1))).toBe(`Maximum ${MAX.name} caractères.`);
    expect(accepts(rule, 'Mamadou')).toBe(true);
  });

  it('accepte le vide quand le champ est facultatif', () => {
    const rule = optionalText(MAX.city);
    expect(accepts(rule, '')).toBe(true);
    expect(accepts(rule, undefined)).toBe(true);
    expect(accepts(rule, 'a'.repeat(MAX.city + 1))).toBe(false);
  });
});

describe('numberInput', () => {
  const prix = numberInput(
    z.number({ required_error: 'Le prix est requis', invalid_type_error: 'Le prix est requis' })
      .min(0, 'Le prix ne peut pas être négatif'),
  );

  it('signale un champ vide au lieu de le convertir en 0', () => {
    // z.coerce.number() aurait accepté '' comme 0 et laissé partir un prix nul.
    expect(messageFor(prix, '')).toBe('Le prix est requis');
    expect(messageFor(prix, undefined)).toBe('Le prix est requis');
  });

  it('accepte une saisie numérique et la convertit', () => {
    expect(prix.parse('25000')).toBe(25000);
    expect(prix.parse(0)).toBe(0);
  });

  it('applique les bornes du schéma', () => {
    expect(messageFor(prix, '-1')).toBe('Le prix ne peut pas être négatif');
  });
});

describe('pastDateRule', () => {
  it('accepte une date passée ou un champ vide', () => {
    expect(accepts(pastDateRule, '1990-05-12')).toBe(true);
    expect(accepts(pastDateRule, '')).toBe(true);
  });

  it('refuse aujourd\'hui et le futur', () => {
    const today  = new Date().toISOString().split('T')[0];
    const demain = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(accepts(pastDateRule, today)).toBe(false);
    expect(accepts(pastDateRule, demain)).toBe(false);
  });
});
