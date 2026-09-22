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
- Si le lecteur intégré ne sait pas décoder la vidéo (ProRes, certains enregistrements HEVC ou
  10 bits), l'application fabrique d'abord une **copie d'aperçu** en 720p — une ligne de
  progression s'affiche au-dessus des commandes — et la lit à la place. Le cadrage, les
  sous-titres et l'export utilisent toujours le fichier d'origine.
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
jamais la fenêtre.

Pour les clips multipistes, le lecteur joue le **mixage d'export** — les pistes cochées pour
l'export, sommées exactement comme l'export le fera — plutôt que la piste par défaut du fichier.
Le mixage est préparé en arrière-plan juste après le chargement (petit indicateur « mix… » à
côté du bouton muet) et à chaque changement de sélection ; en attendant, la piste par défaut
est jouée.

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
- **Layout → Fill** passe à un seul recadrage 9:16 du gameplay (sans bande webcam). Chaque
  disposition garde son propre rectangle de gameplay : passer de l'une à l'autre ne perd
  jamais votre cadrage.

Lecture : **Espace** lecture/pause · **← / →** ±1 s (**Maj** = ±5 s) · **M** couper le son · **C** couper au niveau de la tête de lecture · barre de défilement.

### Segments (coupures)

Un clip qui alterne les scènes peut utiliser une disposition différente selon le moment. Dans le
panneau **Segments** :

- **Detect cuts** analyse la vidéo et la découpe là où l'image change. _Low_ ne retient que les
  coupures franches, _High_ aussi les plus douces ; si rien n'est trouvé, augmentez la
  sensibilité.
- **Add cut** (ou **C**) coupe le segment sous la tête de lecture en deux.
- Chaque ligne affiche sa plage — cliquez pour vous y rendre — avec un sélecteur **Split / Fill**
  et **✕** pour la fusionner avec le segment précédent. **Clear cuts** revient à un seul segment.
- Les boutons de disposition et les rectangles s'appliquent toujours au segment sous la tête de
  lecture ; l'aperçu le suit, comme l'export.

Les coupures appartiennent au clip, pas aux préréglages : charger une autre vidéo repart d'un
seul segment.

### Découpe

Seule une partie du clip doit sortir ? Placez la tête de lecture et appuyez sur **[** (ou **I**)
pour fixer le début, **]** (ou **O**) pour la fin. La barre de défilement grise ce qui est
exclu, la lecture boucle dans l'intervalle et la barre d'export affiche la durée découpée. Le
**×** à côté de l'intervalle rétablit le clip entier. Les sous-titres sont générés sur tout le
clip et suivent la découpe automatiquement ; la découpe est propre au clip et ne fait pas partie
d'une configuration.

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
   ou boîte de fond, ombre, position (bas / centre / haut) avec sa marge depuis le bord plus un
   **décalage vertical** pour ajuster finement vers le haut ou le bas, nombre maximal de
   caractères par ligne (retour automatique). Avec une boîte de fond ou un surlignage en boîte,
   deux curseurs **box padding** (horizontal / vertical) agrandissent les boîtes autour du texte.
   L'aperçu de droite reflète le résultat en direct et tout est enregistré dans les préréglages
   comme les autres options.
7. **Mot en cours** : met en valeur le mot prononcé — **Boîte** (par défaut, un rectangle derrière
   le mot), **Couleur du texte**, **Couleur du contour** (indisponible avec une boîte de
   fond) ou **Aucun** — avec la **couleur de surlignage** de votre choix. Les temps des mots
   viennent de la reconnaissance vocale ; un sous-titre modifié les conserve tant qu'il garde le
   même nombre de mots, sinon sa durée est répartie uniformément entre les mots.

Les sous-titres sont **incrustés** dans la vidéo (ils font partie de l'image), ce qui est
nécessaire sur TikTok et Shorts pour la lecture automatique sans son.

## 5. Outro / appel à l'action (optionnel)

Déposez une vidéo verticale sur le panneau **Outro** ou cliquez sur **Choose outro…**, puis
choisissez un **Placement** :

- **After the clip** (par défaut) l'ajoute telle quelle après le clip, en letterbox si elle n'est
  pas en 9:16, jamais déformée. Une outro transparente est composée sur du noir : une carte de fin
  qui se termine en fondu garde son fondu. Les sous-titres n'apparaissent pas dessus et elle n'est
  pas visible dans l'aperçu.
- **On top of the clip** l'incruste au contraire sur les dernières secondes du clip, sans changer
  la durée de l'export — prévu pour un appel à l'action sur **fond transparent** (ProRes 4444,
  WebM avec alpha…). Son propre son, s'il y en a, est mélangé. Les sous-titres restent au-dessus
  et l'aperçu l'affiche en direct : l'application fabrique une petite copie transparente de
  l'outro au premier import (une ligne de progression s'affiche dans le panneau) tandis que
  l'export utilise le fichier d'origine.

L'outro et son placement sont enregistrés dans la configuration : un preset « Shorts » peut donc
porter sa propre carte de fin.

L'application conserve sa **propre copie** de l'outro dans `%APPDATA%\ClipReframe\outros` : vous
pouvez ensuite déplacer ou supprimer l'original. Les copies que plus aucune configuration
n'utilise sont nettoyées au démarrage suivant. Les configurations enregistrées avec la 0.1.0
pointent encore vers le fichier d'origine : re-choisissez l'outro une fois et enregistrez la
configuration pour passer à une copie.

## 6. Export

Cliquez sur **Export** et choisissez un dossier. Le fichier est nommé `<clip>_vertical.mp4` (le
dossier est mémorisé). Une barre de progression affiche la vitesse ; **Cancel** interrompt et
supprime le fichier partiel. Une fois terminé, le chemin dans la barre du bas ouvre le dossier.

Sortie : 1080×1920, H.264 profil High, CRF 17 (visuellement sans perte), yuv420p, fréquence
d'images de la source (plafonnée à 60), AAC 192 kbps 48 kHz, `faststart` — accepté tel quel par
TikTok et YouTube Shorts.

**Encodage GPU.** Au lancement, l'application teste les encodeurs GPU (NVIDIA NVENC, AMD AMF,
Intel Quick Sync) et utilise le premier qui fonctionne — plusieurs fois plus rapide que le
processeur à qualité constante équivalente. Le sélecteur à côté d'**Export** bascule entre
**GPU** et **CPU (x264)** ; le choix est mémorisé sur ce PC. Si l'encodeur GPU échoue en cours de
route, l'export est refait sur le processeur automatiquement et un message vous prévient. La
reconnaissance vocale tourne toujours sur le processeur.

## Dépannage

| Symptôme                                                  | Cause / solution                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Bandeau rouge « Missing runtime files »                   | Le dossier `%TEMP%\ClipReframe                                                                                                   |
| esourcesin` a été supprimé — relancez l'exe.              |
| La vidéo se charge mais reste noire / ne se lit pas       | Codec non pris en charge par Chromium (certains HEVC / 10 bits). Réencodez d'abord en H.264.                                     |
| « Outro video not found » après application d'un preset   | Le fichier de l'outro a été déplacé. Sélectionnez-le à nouveau.                                                                  |
| Sous-titres dans la mauvaise langue                       | Réglez la langue parlée avant de générer ; `Auto-detect` peut se tromper sur les clips courts.                                   |
| Les sous-titres exportés diffèrent légèrement de l'aperçu | L'aperçu est une approximation CSS du moteur de rendu ; tailles et positions concordent, le rendu du contour diffère à la marge. |
