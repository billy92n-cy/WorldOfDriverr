# TRY AGAIN – coach de prise de masse (PWA)

## Nouveautés de cette version
- **Identité** : logo (anneau + barre), générique d'entrée animé (une fois par session, tap pour passer), thème sombre doré, navigation flottante, bulles au toucher (`ta.css`, `ta.js`).
- **Mode entraînement immersif** (`ws.js`, `ws.css`) : plein écran, un exercice et une série à la fois, charge et répétitions en gros boutons, dernière performance, repos intégré (+15 s / −15 s / passer), validation en bas d'écran à une main, progression par exercice, bilan final (volume, séries, meilleures séries, record). Sauvegarde à chaque action ; si l'app est fermée, la séance et le repos en cours sont repris à la réouverture.
- **Démonstrations** : source retenue **Free Exercise DB** (domaine public, sans clé, sans compte, 873 exercices). Ce sont **deux images (départ/arrivée) animées en fondu**, pas des vidéos : les API avec vraies vidéos ou GIF de qualité sont payantes ou limitées. Pause/lecture, chargement, et secours automatique sur l'animation vectorielle existante si l'exercice n'est pas trouvé ou si le réseau échoue. Fiche : muscles, consignes, erreurs fréquentes, étapes détaillées (en anglais, source).
- **Haptique** : `navigator.vibrate()` si disponible (Android/Chrome). iOS Safari ne l'expose pas : technique de repli via `<input switch>` (Safari 17.4+), **non vérifiée sur iPhone réel** ; le retour de fin de repos (déclenché par un minuteur, hors geste) peut ne pas être ressenti sur iOS. Compléments : bip sonore et pulsation visuelle.
- **Correctifs** : `sw.js` était vide (aucun mode hors ligne) ; schémas de muscles : attribut `rx` invalide corrigé dans `app.js`.

## Clés API
Aucune clé n'est nécessaire pour les démonstrations. Pour le coach et la photo : `GEMINI_API_KEY` (secret du Worker), `APP_TOKEN` (code d'accès choisi par toi, saisi une fois dans l'app), `ALLOWED_ORIGIN`. Jamais de clé dans le navigateur ni dans le dépôt.

## Tests réellement exécutés (Chromium, 390×844, bibliothèque d'exercices simulée)
Chargement sans erreur console, lecteur à 2 images, validation d'une série, repos, rechargement en plein repos (reprise), séance complète jusqu'au bilan, enregistrement dans l'historique, enregistrement du service worker.
**Non vérifié** : vraie bibliothèque Free Exercise DB (pas d'accès réseau ici : le choix des fiches repose sur une correspondance de noms à contrôler), iPhone réel, haptique iOS, appel Gemini réel.

## Pas encore fait
Refonte visuelle des autres onglets (Aujourd'hui, Nutrition, Progrès, Coach : seulement re-thémés), base alimentaire étendue, planification des repas, liste de courses, améliorations du coach, variantes par matériel, estimation du délai de progression.

---

## Contenu
`index.html`, `style.css`, `app.js`, `sw.js`, `manifest.json`, icônes : la PWA (aucune dépendance, aucun build).
`worker.mjs`, `wrangler.toml` : serveur Cloudflare Worker qui protège la clé Gemini (coach + analyse photo).

## Déploiement
1. **PWA** : héberge les fichiers statiques en HTTPS (GitHub Pages, Netlify, Cloudflare Pages). Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ».
2. **Worker** (facultatif, pour le coach conversationnel et la photo) :
   `wrangler secret put GEMINI_API_KEY` · `wrangler secret put APP_TOKEN` · éditer `ALLOWED_ORIGIN` (adresse exacte de la PWA, sans « / » final) · `wrangler deploy`.
3. Dans l'app : Coach → Connexion → adresse du Worker + code d'accès (`APP_TOKEN`).
Variables : `GEMINI_API_KEY` (secret), `APP_TOKEN` (secret), `ALLOWED_ORIGIN`, `GEMINI_MODEL` (vérifie le modèle et ses quotas dans la documentation Google), `HOURLY_LIMIT`.
Sans Worker, tout le reste fonctionne hors ligne ; le coach affiche alors un message clair et l'analyse locale reste disponible.

## Fonctionnalités
Base de 44 aliments (kcal, P, G, L, fibres pour 100 g) avec recherche sans accents, favoris, récents, dernière portion mémorisée ; 5 recettes calculées depuis la base ; eau ; historique 7 jours. Séances salle/maison, séries, répétitions, charges, minuteur de repos réel, enregistrement automatique, surcharge progressive, détection des stagnations, semaine de décharge (proposée puis lancée par toi : −1 série, charges à 90 %). Fiche exercice : animation, muscles ciblés (vue avant/arrière), consignes, erreurs fréquentes. Poids avec moyenne mobile 7 jours, mensurations, records (1RM estimé, formule d'Epley), bilans jour/semaine/mois. Données absentes affichées « — », jamais inventées. Sauvegarde locale + export/import JSON.

## Tests exécutés (Node 22, simulés)
- `t2` (client, DOM simulé) : cohérence kcal/macros des 44 aliments, recherche, ajout au journal, recettes, moyenne mobile, bilans, records, décharge, mensurations, rendu des 5 écrans, persistance.
- `t` (client) : chat (succès, 429, erreurs exclues du contexte, échappement HTML), analyse photo (cohérence, validation, persistance).
- `w` (Worker, Gemini simulé) : origine, jeton, validation, quota, normalisation, taille, limite horaire.
**Non exécuté** : appel réel à l'API Gemini (aucun secret ni accès réseau ici), test sur iPhone réel, rendu visuel dans un navigateur.

## Limites connues
- Démonstrations : images animées (Free Exercise DB), pas de vidéos.
- 18 exercices, programme push/pull/legs ; pas de choix de matériel détaillé.
- Pas de rappels (les notifications push iOS exigent un serveur et l'autorisation de l'utilisateur), pas de photos de progression, pas de liste de courses, pas d'import d'aliments personnalisés.
- Valeurs nutritionnelles moyennes indicatives (références usuelles), non issues d'une base officielle ; vérifie-les avant usage médical ou sportif de haut niveau.
- Sommeil et récupération sont saisis à la main : aucune montre connectée.
- Worker : limite horaire approximative (par instance) et code d'accès partagé, sans comptes.

## Synchronisation multi-appareils (évaluation, non implémentée)
Il faut des comptes et une base distante. Options : **Cloudflare D1 + Workers** (cohérent avec le Worker existant, coût très faible, à construire soi-même), **Supabase** (Postgres, authentification, règles de sécurité par utilisateur ; offre gratuite puis formule payante), **Firebase** (Auth + Firestore, tarification à l'usage). Recommandation : Supabase pour aller vite et sécuriser les données par utilisateur, D1 si tu veux tout garder chez Cloudflare. Stratégie : un enregistrement par jour avec date de modification, la version la plus récente l'emporte ; photos de progression en stockage objet privé. Vérifie les tarifs actuels avant de choisir.
