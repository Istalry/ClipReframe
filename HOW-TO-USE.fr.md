# Guide d'utilisation de ClipReframe

> 🇬🇧 [English version](HOW-TO-USE.md)

ClipReframe transforme un clip de stream 16:9 (gameplay + webcam) en vidéo verticale 1080×1920
prête pour TikTok et YouTube Shorts. Rien à installer : lancez `ClipReframe-<version>-portable.exe`.

> Le premier lancement prend ~20 s, le temps que l'application se décompresse dans
> `%TEMP%\ClipReframe`. Les lancements suivants sont instantanés. Vous pouvez supprimer ce
> dossier à tout moment, il sera recréé.

## 1. Ouvrir un clip

- **Glissez-déposez** une vidéo n'importe où sur la fenêtre, ou cliquez sur **Browse…**.
- Formats acceptés : `.mp4`, `.mov`, `.mkv`, `.webm`, `.m4v`. Toutes les résolutions fonctionnent ;
  le 16:9 est le format pour lequel la mise en page est conçue (un message vous prévient pour les
  autres ratios).
- Déposer un autre fichier alors qu'un clip est ouvert **remplace** le clip (un voile violet « Drop
  to replace » le confirme). Le panneau de droite n'est pas couvert par ce voile : vous pouvez donc
  toujours y déposer un outro.

### Audio multipiste

Si le clip contient **plusieurs pistes audio** (enregistrement OBS typique : mix / micro / Discord /
jeu), une fenêtre **Audio tracks** s'ouvre juste après le chargement. Elle comporte deux colonnes de
cases à cocher, toutes cochées par défaut :

| Colonne       | Usage des pistes cochées                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| **Subtitles** | Mixées ensemble puis envoyées à la reconnaissance vocale — ne cochez que les voix pour un meilleur résultat. |
| **Export**    | Sommées dans l'unique piste stéréo de la vidéo exportée — en général tout.                                   |

Les noms de pistes proviennent des titres de flux écrits par le logiciel d'enregistrement. Le choix
est propre au clip (il n'est pas enregistré dans les configurations) et se résume dans le panneau
Subtitles : « Audio: subtitles from tracks 1+2 · export 1+2+3 » ; cliquez sur **change** pour rouvrir
la fenêtre. Générer des sous-titres sans aucune piste cochée affiche une erreur ; exporter sans piste
cochée produit une vidéo muette (la fenêtre vous prévient). Les clips à une seule piste n'affichent
jamais la fenêtre. Le lecteur intégré ne lit que la piste par défaut du fichier ; l'export et les
sous-titres suivent votre sélection.

## 2. Cadrer les deux rectangles

Au centre : votre source. À droite : le résultat vertical, en direct.

| Rectangle    | Destination          | Couleur |
| ------------ | -------------------- | ------- |
| **Webcam**   | haut de la verticale | cyan    |
| **Gameplay** | bas de la verticale  | rose    |

- Glissez l'intérieur d'un rectangle pour le déplacer. Tirez une poignée pour le redimensionner
  (le ratio est verrouillé : le recadrage remplit toujours sa bande sans déformation).
- Cliquez sur un rectangle pour le sélectionner ; une grille des tiers apparaît.
- Le curseur **Webcam height** — ou la ligne violette dans l'aperçu — règle la part de la
  verticale occupée par la webcam (20 % à 60 %). Les rectangles se réajustent automatiquement.
- **Layout → Fill** passe à un seul recadrage 9:16 du gameplay (sans bande webcam).

Lecture : **Espace** lecture/pause · **← / →** ±1 s (**Maj** = ±5 s) · **M** couper le son · barre de défilement.

## 3. Configurations (presets)

Colonne de gauche. Une configuration enregistre la mise en page, les deux rectangles, le ratio de
séparation, les réglages et le style des sous-titres, ainsi que l'outro.

- **New** → nommez-la → **Save** : enregistre les réglages actuels.
- Cliquez sur une configuration pour l'**appliquer** au clip en cours.
- **★** désigne la configuration **par défaut** : elle est appliquée automatiquement à chaque
  nouveau clip ouvert.
- Modifiez quelque chose après l'avoir appliquée et un bouton **Update « nom »** apparaît ; la
  ligne affiche un **●** tant que des changements ne sont pas enregistrés.
- **🗑** supprime (avec confirmation).

Les presets sont stockés dans `%APPDATA%\ClipReframe\presets.json` ; copiez ce fichier pour les
transférer sur un autre PC.

## 4. Sous-titres (optionnel)

1. Activez **Subtitles**.
2. Choisissez la **langue parlée** (`Auto-detect` par défaut ; fixer la langue est plus fiable sur les clips courts).
3. Cliquez sur **Generate subtitles**. La reconnaissance vocale tourne en local (rien n'est envoyé
   sur Internet). Comptez environ la moitié de la durée du clip sur un processeur récent.
4. Une passe de nettoyage supprime les artefacts courants (mots répétés, marqueurs du type
   `[Musique]`, phrases en boucle) — la notification indique combien ont été retirés.
5. Modifiez n'importe quel sous-titre : texte, début/fin (en secondes). Cliquer dans un sous-titre
   place le lecteur à cet instant ; le sous-titre actif est surligné pendant la lecture. Le **🗑**
   d'une ligne la supprime.
6. **Style** : police (toutes celles installées), taille, gras/italique/majuscules, couleur, contour
   ou boîte de fond, ombre, position (bas / centre / haut) et marge, nombre maximal de caractères
   par ligne (retour automatique). L'aperçu de droite reflète le résultat en direct.
7. **Mot en cours** : met en valeur le mot prononcé — **Boîte** (par défaut, une pastille arrondie
   derrière le mot), **Couleur du texte**, **Couleur du contour** (indisponible avec une boîte de
   fond) ou **Aucun** — avec la **couleur de surlignage** de votre choix. Les temps des mots
   viennent de la reconnaissance vocale ; un sous-titre modifié les conserve tant qu'il garde le
   même nombre de mots, sinon sa durée est répartie uniformément entre les mots.

Les sous-titres sont **incrustés** dans la vidéo (ils font partie de l'image), ce qui est
nécessaire sur TikTok et Shorts pour la lecture automatique sans son.

## 5. Outro / appel à l'action (optionnel)

Déposez une vidéo verticale sur le panneau **Outro** ou cliquez sur **Choose outro…**. Elle est
ajoutée telle quelle après le clip. Si elle n'est pas en 9:16 elle est encadrée de bandes noires,
jamais déformée. Les sous-titres n'apparaissent jamais sur l'outro. L'outro est enregistré dans la
configuration : un preset « Shorts » peut donc embarquer sa propre fin de vidéo.

## 6. Export

Cliquez sur **Export** et choisissez un dossier. Le fichier est nommé `<clip>_vertical.mp4` (le
dossier est mémorisé). Une barre de progression affiche la vitesse ; **Cancel** interrompt et
supprime le fichier partiel. Une fois terminé, le chemin dans la barre du bas ouvre le dossier.

Sortie : 1080×1920, H.264 profil High, CRF 17 (visuellement sans perte), yuv420p, fréquence
d'images de la source (plafonnée à 60), AAC 192 kbps 48 kHz, `faststart` — accepté tel quel par
TikTok et YouTube Shorts.

## Dépannage

| Symptôme                                                  | Cause / solution                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Bandeau rouge « Missing runtime files »                   | Le dossier `%TEMP%\ClipReframe                                                                                                   |
| esourcesin` a été supprimé — relancez l'exe.              |
| La vidéo se charge mais reste noire / ne se lit pas       | Codec non pris en charge par Chromium (certains HEVC / 10 bits). Réencodez d'abord en H.264.                                     |
| « Outro video not found » après application d'un preset   | Le fichier de l'outro a été déplacé. Sélectionnez-le à nouveau.                                                                  |
| Sous-titres dans la mauvaise langue                       | Réglez la langue parlée avant de générer ; `Auto-detect` peut se tromper sur les clips courts.                                   |
| Les sous-titres exportés diffèrent légèrement de l'aperçu | L'aperçu est une approximation CSS du moteur de rendu ; tailles et positions concordent, le rendu du contour diffère à la marge. |
