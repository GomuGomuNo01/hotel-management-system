/**
 * Traduction française des messages d'erreur zod par défaut.
 * Les messages personnalisés passés inline (min(1, '…')) restent prioritaires.
 * Importé une seule fois dans main.jsx (effet de bord global).
 */
import { z } from 'zod';

const frErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') {
        return { message: 'Ce champ est requis.' };
      }
      return { message: 'Valeur invalide.' };

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return {
          message: issue.minimum === 1
            ? 'Ce champ est requis.'
            : `Au moins ${issue.minimum} caractères requis.`,
        };
      }
      if (issue.type === 'number') return { message: `La valeur doit être supérieure ou égale à ${issue.minimum}.` };
      if (issue.type === 'array')  return { message: `Sélectionnez au moins ${issue.minimum} élément(s).` };
      return { message: 'Valeur trop petite.' };

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `${issue.maximum} caractères maximum.` };
      if (issue.type === 'number') return { message: `La valeur doit être inférieure ou égale à ${issue.maximum}.` };
      if (issue.type === 'array')  return { message: `Sélectionnez au plus ${issue.maximum} élément(s).` };
      return { message: 'Valeur trop grande.' };

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Adresse e-mail invalide.' };
      if (issue.validation === 'url')   return { message: 'URL invalide.' };
      return { message: 'Format invalide.' };

    case z.ZodIssueCode.invalid_enum_value:
    case z.ZodIssueCode.invalid_literal:
      return { message: 'Valeur non autorisée.' };

    case z.ZodIssueCode.invalid_date:
      return { message: 'Date invalide.' };

    default:
      return { message: ctx.defaultError === 'Invalid input' ? 'Valeur invalide.' : ctx.defaultError };
  }
};

z.setErrorMap(frErrorMap);
