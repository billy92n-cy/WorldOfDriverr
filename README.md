# Mass – coach de prise de masse (PWA)

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
- Animations : figures vectorielles, pas de vidéos ni de photos d'exercices (aucun accès réseau pour récupérer une bibliothèque sous licence). Piste : intégrer *free-exercise-db* (licence Unlicense) en vérifiant la licence de chaque image.
- 18 exercices, programme push/pull/legs ; pas de choix de matériel détaillé.
- Pas de rappels (les notifications push iOS exigent un serveur et l'autorisation de l'utilisateur), pas de photos de progression, pas de liste de courses, pas d'import d'aliments personnalisés.
- Valeurs nutritionnelles moyennes indicatives (références usuelles), non issues d'une base officielle ; vérifie-les avant usage médical ou sportif de haut niveau.
- Sommeil et récupération sont saisis à la main : aucune montre connectée.
- Worker : limite horaire approximative (par instance) et code d'accès partagé, sans comptes.

## Synchronisation multi-appareils (évaluation, non implémentée)
Il faut des comptes et une base distante. Options : **Cloudflare D1 + Workers** (cohérent avec le Worker existant, coût très faible, à construire soi-même), **Supabase** (Postgres, authentification, règles de sécurité par utilisateur ; offre gratuite puis formule payante), **Firebase** (Auth + Firestore, tarification à l'usage). Recommandation : Supabase pour aller vite et sécuriser les données par utilisateur, D1 si tu veux tout garder chez Cloudflare. Stratégie : un enregistrement par jour avec date de modification, la version la plus récente l'emporte ; photos de progression en stockage objet privé. Vérifie les tarifs actuels avant de choisir.
