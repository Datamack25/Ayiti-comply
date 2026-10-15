# Dossier Haïti

Plateforme statique (HTML, CSS, JavaScript) qui présente Haïti en cinq chapitres :

- le système LCB-FT (cadre juridique, acteurs, plan d'action GAFI, sanctions, typologies) ;
- la création d'entreprise de A à Z ;
- le système bancaire ;
- les industries et produits fabriqués ;
- comment voyager dans le pays.

Toutes les données sont stockées dans des fichiers CSV (dossier `data/`). Le bouton « Télécharger le dossier en PDF » génère un PDF complet (page de garde, sommaire, chapitres, sources), et chaque chapitre a son propre bouton PDF. Aucun serveur, aucune base de données, aucun coût.

## Structure

```
index.html            page unique
assets/style.css      design
assets/app.js         lecture des CSV, affichage, génération du PDF
assets/vendor/        PapaParse (lecture CSV) et pdfmake (PDF), inclus localement
data/*.csv            toutes les données
```

## Modifier le contenu

Ouvrez un CSV dans Excel, LibreOffice ou directement sur GitHub, modifiez une ligne, enregistrez en CSV UTF-8 (séparateur virgule). Le site et le PDF se mettent à jour automatiquement.

- `textes.csv` : titres et paragraphes d'introduction.
- `pays_fiche.csv` : la fiche signalétique.
- `lcbft_*.csv`, `entreprise_*.csv`, `banques_*.csv`, `industries_*.csv`, `voyage_*.csv` : les chapitres.
- `sources.csv` : la bibliographie. La colonne `source_id` des autres fichiers renvoie à ces identifiants.

## Publier gratuitement sur GitHub Pages

1. Créez un dépôt public sur GitHub (par exemple `dossier-haiti`).
2. Envoyez-y le contenu de ce dossier (bouton « Add file » puis « Upload files », ou `git push`).
3. Dans le dépôt : Settings, puis Pages. Source : « Deploy from a branch », branche `main`, dossier `/ (root)`. Enregistrez.
4. Après une à deux minutes, le site est en ligne à l'adresse `https://votre-pseudo.github.io/dossier-haiti/`. Partagez ce lien.

## Tester sur votre ordinateur

Les navigateurs bloquent la lecture des CSV quand on ouvre `index.html` par double-clic. Lancez plutôt un petit serveur depuis ce dossier :

```
python -m http.server 8000
```

puis ouvrez `http://localhost:8000`.

## Avertissement

Ce dossier est un support d'information, mis à jour le 15 octobre 2026. Il ne constitue ni un conseil juridique ni un conseil de voyage : vérifiez les textes et consignes en vigueur auprès des autorités compétentes.

## Version Streamlit (option)

Le dépôt contient aussi `streamlit_app.py` et `requirements.txt` pour déployer la même plateforme sur Streamlit Community Cloud :

- Repository : votre dépôt GitHub
- Branch : `main`
- Main file path : `streamlit_app.py`

Le PDF et les CSV fonctionnent de la même manière dans les deux versions.
