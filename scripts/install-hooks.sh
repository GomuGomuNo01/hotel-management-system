#!/usr/bin/env bash
#
# Installe le hook pre-commit qui bloque les secrets avant qu'ils entrent
# dans l'historique. La CI fait le même contrôle, mais après le push :
# à ce stade un secret poussé sur un dépôt public est déjà compromis.
#
# Usage : bash scripts/install-hooks.sh

set -euo pipefail
cd "$(dirname "$0")/.."

hook=".git/hooks/pre-commit"

cat > "$hook" <<'HOOK'
#!/usr/bin/env bash
# Installé par scripts/install-hooks.sh
exec bash "$(git rev-parse --show-toplevel)/scripts/check-secrets.sh" --staged
HOOK

chmod +x "$hook"
echo "Hook pre-commit installé : $hook"
echo "Pour le contourner ponctuellement (à éviter) : git commit --no-verify"
