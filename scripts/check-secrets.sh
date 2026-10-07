#!/usr/bin/env bash
#
# Détecte les vraies valeurs de secrets dans les fichiers suivis par git.
#
# Les .env réels sont ignorés par .gitignore ; la fuite publique de ce dépôt
# est venue des .env.example, qui eux sont faits pour être commités et dans
# lesquels de vraies clés avaient été collées à la place des placeholders.
# Ce script ferme précisément ce trou.
#
# Usage :
#   scripts/check-secrets.sh            # analyse les fichiers suivis
#   scripts/check-secrets.sh --staged   # analyse l'index (hook pre-commit)
#
# Sortie : 0 si propre, 1 si un secret est trouvé.

set -uo pipefail
cd "$(dirname "$0")/.."

mode="${1:-}"
if [[ "$mode" == "--staged" ]]; then
    files=$(git diff --cached --name-only --diff-filter=ACM)
else
    files=$(git ls-files)
fi

[[ -z "$files" ]] && exit 0

# Motifs de secrets réels. Volontairement ancrés sur des formats reconnaissables
# plutôt que sur l'entropie, pour éviter les faux positifs sur du code.
declare -A patterns=(
    ["Secret client Google OAuth"]='GOCSPX-[A-Za-z0-9_-]{10,}'
    ["ID client Google OAuth"]='[0-9]{9,}-[a-z0-9]{20,}\.apps\.googleusercontent\.com'
    ["Clé applicative Laravel"]='base64:[A-Za-z0-9+/=]{40,}'
    ["Clé API AWS"]='AKIA[0-9A-Z]{16}'
    ["Jeton GitHub"]='gh[pousr]_[A-Za-z0-9]{36,}'
    ["Clé API Stripe"]='sk_(live|test)_[A-Za-z0-9]{20,}'
    ["Clé privée"]='-----BEGIN [A-Z ]*PRIVATE KEY-----'
    ["Identifiant SMTP"]='MAIL_(USERNAME|PASSWORD)=[0-9a-f]{12,}'
    ["Secret webhook"]='(ORANGE_CI|WAVE_CI)_(WEBHOOK_SECRET|API_KEY|MERCHANT_KEY)=.{12,}'
    ["Secret Reverb"]='REVERB_APP_SECRET=[A-Za-z0-9]{10,}'
)

# Valeurs d'exemple légitimes : un .env.example DOIT en contenir.
placeholders='your-|votre-|xxx|XXX|changeme|placeholder|<[a-z]|example\.com|\.\.\.|^$'

found=0
for label in "${!patterns[@]}"; do
    # -H force le préfixe du nom de fichier même quand un seul fichier est
    # analysé (cas du hook pre-commit), sans quoi file et line se décalent.
    while IFS= read -r hit; do
        [[ -z "$hit" ]] && continue
        # Ignore le script lui-même, qui contient forcément les motifs.
        [[ "$hit" == scripts/check-secrets.sh:* ]] && continue

        file="${hit%%:*}"
        rest="${hit#*:}"
        line="${rest%%:*}"
        value="${rest#*:}"

        echo "$value" | grep -qE "$placeholders" && continue

        if [[ $found -eq 0 ]]; then
            echo "Secrets détectés dans des fichiers suivis par git :"
            echo
        fi
        found=1
        # La valeur n'est jamais affichée : la sortie de ce script finit dans
        # les logs CI, publics sur un dépôt public.
        echo "  [$label]  $file:$line"
    done < <(echo "$files" | tr '\n' '\0' | xargs -0 grep -HnIE "${patterns[$label]}" 2>/dev/null)
done

if [[ $found -eq 1 ]]; then
    cat <<'EOF'

Ces valeurs ne doivent pas être versionnées.

  - Dans un .env.example, remplacez-les par un placeholder (« your-client-id »).
  - Les vraies valeurs vont dans .env, qui est ignoré par git.
  - Si la valeur a déjà été poussée, considérez-la comme compromise :
    révoquez-la et régénérez-en une nouvelle avant toute autre chose.
    La retirer du fichier ne suffit pas, l'historique git la conserve.
EOF
    exit 1
fi

echo "Aucun secret détecté dans les fichiers suivis."
exit 0
