# Politique de sécurité

**La baie des lacs** est une application de gestion hôtelière qui manipule des
données personnelles de clients (identité, pièces justificatives, séjours) et
des transactions de paiement. Les signalements de vulnérabilité sont donc pris
au sérieux et traités en priorité.

---

## Périmètre couvert

Ce projet n'est pas une bibliothèque distribuée : il n'y a ni versions publiées
ni branches de maintenance. Une seule ligne de code est en service.

| Ce qui est suivi | Détail |
|---|---|
| Branche `main` | Seule version supportée. `Dev` et `Test` sont maintenues au même niveau. |
| API backend | Laravel 13 / PHP 8.4 — `backend/` |
| SPA frontend | React 18 / Vite 5 — `frontend/` |
| Déploiement | Compose Docker, Caddy, Reverb — `deploy/` |

Les correctifs de sécurité sont appliqués sur `main` et propagés immédiatement.
Aucun rétroportage n'est possible ni prévu : mettez-vous à jour sur `main`.

---

## Signaler une vulnérabilité

**N'ouvrez pas d'issue publique** pour une faille de sécurité, et ne la décrivez
pas dans une pull request ou une discussion. Une issue publique expose le
problème à tout le monde avant qu'un correctif n'existe.

Utilisez le signalement privé de GitHub :

> **Security** → **Report a vulnerability**
> <https://github.com/GomuGomuNo01/hotel-management-system/security/advisories/new>

Le fil reste privé entre vous et le mainteneur jusqu'à publication de l'avis.

### Ce qui aide à traiter vite

- Le type de faille et le composant touché (route d'API, page, script de déploiement).
- Les étapes de reproduction, aussi précises que possible.
- L'impact tel que vous l'estimez : lecture de données d'autrui, élévation de
  privilège, contournement de paiement, exécution de code…
- Tout ce qui sert de preuve : requête HTTP, capture, extrait de log.

Une description partielle vaut mieux que pas de signalement : envoyez ce que
vous avez.

### Délais

Projet maintenu par une seule personne, donc des engagements tenables plutôt
qu'ambitieux :

| Étape | Délai visé |
|---|---|
| Accusé de réception | 5 jours ouvrés |
| Première évaluation (confirmée / rejetée, sévérité) | 10 jours ouvrés |
| Correctif pour une faille critique ou élevée | dès que possible, avec des points d'étape |
| Correctif pour une faille moyenne ou faible | intégré au cycle de développement normal |

Si vous n'avez pas de réponse sous 10 jours ouvrés, relancez via le même fil.

### Divulgation

La divulgation est coordonnée : un correctif est publié d'abord, l'avis ensuite.
Dites-nous si vous souhaitez être crédité et sous quel nom — c'est volontiers
accordé. Merci de laisser un délai raisonnable avant toute publication de votre
côté.

Ce projet n'offre **aucune récompense financière**. Il n'y a pas de programme de
bug bounty.

---

## Hors périmètre

Les points suivants ne seront pas traités comme des vulnérabilités :

- Résultats bruts d'un scanner, sans démonstration d'impact exploitable.
- Failles d'une dépendance tierce sans chemin d'exploitation dans ce projet :
  signalez-les en amont. Celles qui exigent une migration majeure cassante sont
  suivies et documentées dans `.github/workflows/ci.yml`.
- Absence d'en-têtes ou de durcissements sur un environnement de développement
  local (`localhost`, `php artisan serve`, serveur Vite).
- Problèmes supposant un accès physique à la machine, un compte déjà compromis,
  ou l'ingénierie sociale d'un utilisateur.
- Déni de service par volume de requêtes.
- Attaques sur une instance déployée par un tiers, dont la configuration ne
  dépend pas de ce dépôt.

### Jamais de test sur des données réelles

Testez uniquement sur votre propre instance locale, avec des données de
démonstration (`php artisan migrate:fresh --seed`). N'utilisez jamais une
instance en service : elle contient des données personnelles de vrais clients,
et leur accès non autorisé est illégal indépendamment de l'intention.

---

## Protections en place

Utile pour cadrer un signalement ; le détail est dans le README.

- **Authentification** : jetons Sanctum porteurs, sans cookie — pas de surface
  CSRF sur l'API. E-mail vérifié obligatoire, mots de passe forts (8 caractères
  minimum, casse mixte, chiffre, symbole) imposés y compris à la réinitialisation.
- **Anti-force brute** : verrouillage par compte (5 échecs par minute et par
  couple e-mail + IP) en plus de la limitation par IP.
- **Anti-énumération** : connexion à temps constant, messages neutres sur
  « mot de passe oublié » et renvoi de vérification.
- **OAuth** : le jeton ne transite jamais dans l'URL — le callback émet un code
  à usage unique, valable 60 secondes, échangé en POST ; nonce `state`.
- **Paiement** : montant et formule calculés côté serveur, jamais fournis par le
  client. Webhooks signés en HMAC-SHA256, avec contrôle du montant et de la
  devise, garde anti-rejeu et idempotence. Le mode simulation est désactivé par
  défaut et sa route n'est enregistrée qu'en `local` et `testing`.
- **Documents d'identité** : stockés sur le disque privé, hors de toute URL
  publique, servis en pièce jointe et jamais exécutés, avec un contrôle
  d'appartenance (anti-IDOR, anti-traversée de chemin). La lecture conserve un
  repli historique vers le disque public pour d'éventuels fichiers antérieurs à
  cette séparation ; sur une installation à jour, plus aucun document n'y réside.
- **En-têtes** : `Content-Security-Policy` (`default-src 'none'`),
  `Strict-Transport-Security`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **RGPD** : export des données personnelles en PDF, droit à l'oubli par
  anonymisation avec conservation des pièces comptables.

---

## Secrets

Les valeurs réelles vivent dans `.env`, ignoré par git. Les `.env.example` sont
versionnés et ne doivent contenir que des placeholders — c'est par eux que des
identifiants OAuth ont fuité publiquement, alors même que les `.env` étaient
correctement ignorés.

```bash
bash scripts/check-secrets.sh      # analyse les fichiers suivis par git
bash scripts/install-hooks.sh      # hook pre-commit, à installer après clonage
```

Le même contrôle tourne en intégration continue, mais il ne voit le secret
qu'après le push — donc déjà compromis sur un dépôt public. Le hook local est le
véritable filet.

**Un secret poussé est compromis.** Le retirer du fichier ne suffit pas :
l'historique git le conserve. Révoquez-le et régénérez-le avant toute autre
chose.

---

## Déployer sans se tirer une balle dans le pied

Points de configuration qui transforment une installation saine en installation
vulnérable :

- `APP_DEBUG=false` et `APP_ENV=production` — sinon les traces d'exception
  exposent la configuration et des fragments de requêtes.
- `PAYMENT_SIMULATION=false` — à `true`, un paiement se confirme sans qu'un
  centime ne circule.
- `ORANGE_CI_WEBHOOK_SECRET` et `WAVE_CI_WEBHOOK_SECRET` renseignés — sans eux,
  la signature des webhooks ne peut pas être vérifiée.
- `APP_KEY` propre à l'instance, jamais recopiée d'un exemple : elle chiffre les
  données et signe les URL de vérification d'e-mail.
- `FRONTEND_URLS` limité aux origines réellement utilisées.
- HTTPS de bout en bout : `Strict-Transport-Security` n'a aucun effet en clair.
