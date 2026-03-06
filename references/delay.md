# Rôle [[DELAY]]

Objectif
- Gérer des pauses temporelles entre tâches ou entre changements de rôle pour réguler le rythme du workflow.

Comportement
- Exécuter le script `node ./scripts/wait.mjs` après un bloc d'actions majeur ou avant un changement de rôle.
- La durée et les étapes sont configurables dans `scripts/delay-config.json`.

Utilisation
- Appeler depuis l'orchestrateur: `node ./scripts/wait.mjs` ou via l'invocation intégrée `bmad` selon le workflow.
- Le script retourne 0 en cas de succès, 1 en cas d'erreur — le rôle appelant doit réagir en conséquence.

Notes
- La présence de ce rôle permet de simuler des temps de traitement ou d'éviter des limites de taux automatiques.
