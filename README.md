Freestyle Tricks
Planning des activités sportives du groupe WhatsApp Freestyle Tricks : chacun propose une activité, s'inscrit, vote pour des dates, et retrouve des séances types.
Site statique (HTML, CSS, JavaScript) publié avec GitHub Pages. Les données (activités, inscriptions, votes) sont dans une base Supabase.
Organisation des fichiers
```
index.html              Structure de la page (onglets, formulaires)
css/style.css           Mise en forme
js/config.js            Adresse de la base Supabase et clés publiques
js/utils.js             Outils partagés (dates, échappement HTML, messages)
js/api.js               Requêtes vers la base
js/planning.js          Affichage du planning, inscriptions, votes, suppression
js/partage.js           Refaire une activité, partage WhatsApp, ajout à l'agenda
js/formulaires.js       Proposer et modifier une activité
js/notifications.js     Installation de l'appli et notifications push
js/main.js              Démarrage et rafraîchissement automatique
seances/                Séances types (tricking, natation, renfo)
sw.js                   Service worker (notifications)
manifest.webmanifest    Fiche de l'appli installable
icon-*.png              Icônes de l'appli
```
Les scripts sont chargés dans cet ordre à la fin de `index.html`. Ils partagent les mêmes variables : `config.js` et `utils.js` doivent rester en premier.
Mettre en ligne
Dépose tous les fichiers à la racine du dépôt `freestyle-tricks`, en gardant les dossiers `css`, `js` et `seances`.
Dans le dépôt : Settings, puis Pages, Branch `main`, dossier `/ (root)`, Save.
Le site est en ligne à `https://marine-data.github.io/freestyle-tricks/` après une ou deux minutes.
Ajouter une séance type
Ajoute la page dans `seances/`.
Dans `index.html`, copie un bloc `<a class="disc" …>` de l'onglet Séances et change le lien, l'emoji, le titre et la description.
