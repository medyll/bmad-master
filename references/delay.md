# Rôle [[DELAY]]

Objectif
- Gérer des pauses temporelles entre tâches ou entre changements de rôle pour réguler le rythme du workflow.

Comportement
- Exécuter `node ./scripts/bmad.mjs wait` après un bloc d'actions majeur ou avant un changement de rôle.
- Support du flag `--seconds <s>` pour des délais personnalisés en secondes.
- La durée et les étapes sont configurables dans `scripts/delay-config.json`.

Utilisation
- Appeler depuis l'orchestrateur: `node ./scripts/bmad.mjs wait [--seconds <s>]` ou via l'alias `node ./scripts/bmad.mjs delay`.
- Le script retourne 0 en cas de succès, 1 en cas d'erreur — le rôle appelant doit réagir en conséquence.

Notes
- La présence de ce rôle permet de simuler des temps de traitement ou d'éviter des limites de taux automatiques.
