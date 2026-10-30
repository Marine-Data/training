# Freestyle Tricks

Planning des activités sportives du groupe WhatsApp Freestyle Tricks : chacun propose une activité, s'inscrit, vote pour des dates, et retrouve des séances types.

Site statique (HTML, CSS, JavaScript) publié avec GitHub Pages. Les données (activités, inscriptions, votes) sont dans une base Supabase.

## Organisation des fichiers

```
index.html              Structure de la page (onglets, formulaires)
css/charte.css          Charte graphique : couleurs (jour et nuit), polices, formes
css/style.css           Mise en forme du planning (utilise charte.css)
css/seances.css         Applique la charte aux pages de séances
js/config.js            Adresse de la base Supabase et clés publiques
js/utils.js             Outils partagés (dates, échappement HTML, messages)
js/api.js               Requêtes vers la base
js/planning.js          Affichage du planning, inscriptions, votes, suppression
js/partage.js           Refaire une activité, partage WhatsApp, ajout à l'agenda
js/formulaires.js       Proposer et modifier une activité
js/lexique.js           Explication courte et vidéo YouTube de chaque exercice technique
js/seances.js           Séances du groupe : créer, modifier, dupliquer, partager, supprimer, proposer au planning
js/notifications.js     Installation de l'appli et notifications push
js/main.js              Démarrage et rafraîchissement automatique
seances/                Séances types (tricking, natation, renfo)
sw.js                   Service worker (notifications)
manifest.webmanifest    Fiche de l'appli installable
icon-*.png              Icônes de l'appli
```

Les scripts sont chargés dans cet ordre à la fin de `index.html`. Ils partagent les mêmes variables : `config.js` et `utils.js` doivent rester en premier.

## Mettre en ligne

1. Dépose tous les fichiers à la racine du dépôt `freestyle-tricks`, en gardant les dossiers `css`, `js` et `seances`.
2. Dans le dépôt : Settings, puis Pages, Branch `main`, dossier `/ (root)`, Save.
3. Le site est en ligne à `https://marine-data.github.io/freestyle-tricks/` après une ou deux minutes.

## Ajouter une séance type

1. Ajoute la page dans `seances/`.
2. Dans `index.html`, copie un bloc `<a class="disc" …>` de l'onglet Séances et change le lien, l'emoji, le titre et la description.

## Charte graphique

Inspirée de l'esthétique manga : papier, encre, trame de points, et trois accents.

- Forêt : actions (s'inscrire, publier, valider).
- Électrique : ce qui te concerne (ton inscription, tes votes, les exercices validés).
- Écarlate : suppression et erreurs.

Toutes les couleurs sont des variables définies dans `css/charte.css`. N'écris jamais une couleur en dur dans un autre fichier : utilise la variable. Le mode nuit suit le réglage du téléphone et ne demande rien de plus.

Polices : Dela Gothic One pour les titres, M PLUS Rounded 1c pour le texte (Google Fonts).

Pour une nouvelle page de séance, ajoute dans le `<head>` le lien des polices et `../css/charte.css`, puis `../css/seances.css` après ton propre `<style>`.

## Séances du groupe

Dans l'onglet Séances, chacun peut créer une séance pour son sport. Le sport choisi pré-remplit les blocs (échauffement, corps de séance…), l'unité proposée (mètres, essais, séries) et des suggestions d'exercices. Ces réglages sont dans `SPORTS`, en haut de `js/seances.js` : chaque sport liste ses blocs, et chaque bloc son unité et ses suggestions. Un bloc renommé (« Retour au calme », « Mobilité »…) reprend les suggestions qui correspondent.

Les séances sont dans la table `ft_seances` de la base Supabase. Les blocs y sont enregistrés en JSON : `[{titre, ex: [{dose, nom, note}]}]`.

Un lien de la forme `…/training/#seance-<id>` ouvre directement une séance. C'est le lien envoyé par le bouton Partager.

## Lexique des exercices

`js/lexique.js` associe chaque exercice technique (L-sit, scapula pull-ups, rondade…) à une explication en français et à une recherche YouTube. Elles s'affichent sous l'exercice dans la fiche de séance et dans l'éditeur. Un exercice dont le nom commence par un mot du lexique est reconnu (« Tractions à la barre fixe » utilise « tractions »).

## Après une modification

Les navigateurs gardent en mémoire les fichiers CSS et JS. Après chaque changement, mets à jour le numéro `?v=…` des liens dans `index.html` (même numéro partout) pour que tout le monde reçoive la nouvelle version.
