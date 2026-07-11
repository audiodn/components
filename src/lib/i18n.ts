// Lightweight i18n for the components. Intentionally tiny: a flat message
// catalog per locale, an English fallback, and `{name}` placeholder
// interpolation. Server-provided strings (API error messages, track titles,
// file names, codecs, etc.) are NOT translated — they are shown verbatim.

export const LOCALES = ['en', 'fr', 'es', 'de'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export type MessageKey =
  | 'action.retry'
  | 'action.reload'
  | 'player.notify.loadFailed'
  | 'player.notify.sessionExpired'
  | 'player.notify.noSession'
  | 'player.notify.trackLoadFailed'
  | 'player.notify.playFailed'
  | 'player.aria.loading'
  | 'player.loadingText'
  | 'player.aria.region'
  | 'player.status.playbackError'
  | 'player.status.buffering'
  | 'player.status.nowPlaying'
  | 'playButton.retry'
  | 'playButton.loading'
  | 'playButton.pause'
  | 'playButton.play'
  | 'progress.aria.label'
  | 'progress.aria.valueText'
  | 'playTime.aria'
  | 'volume.aria'
  | 'settings.aria'
  | 'settings.download'
  | 'settings.notDownloadable'
  | 'trackTitle.none'
  | 'coverArt.none'
  | 'coverArt.alt'
  | 'tracklist.aria'
  | 'waveform.aria'
  | 'notification.dismiss'
  | 'uploader.notify.sessionExpired'
  | 'uploader.notify.uploadSuccess'
  | 'uploader.notify.uploadFailed'
  | 'uploader.notify.networkError'
  | 'uploader.notify.uploadFailedDetail'
  | 'uploader.notify.noAudioFiles'
  | 'uploader.error.tryAgain'
  | 'uploader.aria.loading'
  | 'uploader.loadingText'
  | 'uploader.aria.fileArea'
  | 'uploader.dropHeading'
  | 'uploader.or'
  | 'uploader.browseFiles'
  | 'uploader.aria.selectFiles'
  | 'uploader.aria.totalProgress'
  | 'uploader.totalProgressText'
  | 'uploader.aria.queue'
  | 'uploader.aria.fileProgress'
  | 'uploader.aria.retryFile'
  | 'uploader.aria.cancelUpload'
  | 'uploader.aria.removeFile'

type Messages = Record<MessageKey, string>

const en: Messages = {
  'action.retry': 'Retry',
  'action.reload': 'Reload',
  'player.notify.loadFailed': 'Couldn’t load the player.',
  'player.notify.sessionExpired': 'Your session expired.',
  'player.notify.noSession': 'No play session available',
  'player.notify.trackLoadFailed': 'Couldn’t load this track.',
  'player.notify.playFailed': 'Couldn’t play this track.',
  'player.aria.loading': 'Loading audio player',
  'player.loadingText': 'Loading audio player…',
  'player.aria.region': 'Audio player',
  'player.status.playbackError': 'Playback error',
  'player.status.buffering': 'Buffering',
  'player.status.nowPlaying': 'Now playing: {title}',
  'playButton.retry': 'Retry',
  'playButton.loading': 'Loading',
  'playButton.pause': 'Pause',
  'playButton.play': 'Play',
  'progress.aria.label': 'Playback progress',
  'progress.aria.valueText': '{current} of {total}',
  'playTime.aria': 'Playback time: {elapsed} of {total}',
  'volume.aria': 'Volume',
  'settings.aria': 'Settings',
  'settings.download': 'Download {label}',
  'settings.notDownloadable': 'This track isn’t downloadable.',
  'trackTitle.none': 'No track selected',
  'coverArt.none': 'No cover art',
  'coverArt.alt': 'Cover art',
  'tracklist.aria': 'Track list',
  'waveform.aria': 'Audio waveform',
  'notification.dismiss': 'Dismiss notification',
  'uploader.notify.sessionExpired': 'Your upload session expired.',
  'uploader.notify.uploadSuccess': '{filename} uploaded successfully',
  'uploader.notify.uploadFailed': '{filename}: upload failed',
  'uploader.notify.networkError': '{filename}: network error',
  'uploader.notify.uploadFailedDetail': '{filename}: {error}',
  'uploader.notify.noAudioFiles': 'No audio files detected. Please select audio files.',
  'uploader.error.tryAgain': 'Try again',
  'uploader.aria.loading': 'Loading uploader',
  'uploader.loadingText': 'Loading…',
  'uploader.aria.fileArea': 'File upload area',
  'uploader.dropHeading': 'Drop Audio Tracks To Collection',
  'uploader.or': 'or',
  'uploader.browseFiles': 'Browse Files',
  'uploader.aria.selectFiles': 'Select audio files to upload',
  'uploader.aria.totalProgress': 'Total upload progress',
  'uploader.totalProgressText': '{percent}% total',
  'uploader.aria.queue': 'Upload queue',
  'uploader.aria.fileProgress': 'Upload progress for {filename}',
  'uploader.aria.retryFile': 'Retry upload for {filename}',
  'uploader.aria.cancelUpload': 'Cancel upload for {filename}',
  'uploader.aria.removeFile': 'Remove file {filename}',
}

const fr: Messages = {
  'action.retry': 'Réessayer',
  'action.reload': 'Recharger',
  'player.notify.loadFailed': 'Impossible de charger le lecteur.',
  'player.notify.sessionExpired': 'Votre session a expiré.',
  'player.notify.noSession': 'Aucune session de lecture disponible',
  'player.notify.trackLoadFailed': 'Impossible de charger cette piste.',
  'player.notify.playFailed': 'Impossible de lire cette piste.',
  'player.aria.loading': 'Chargement du lecteur audio',
  'player.loadingText': 'Chargement du lecteur audio…',
  'player.aria.region': 'Lecteur audio',
  'player.status.playbackError': 'Erreur de lecture',
  'player.status.buffering': 'Mise en mémoire tampon',
  'player.status.nowPlaying': 'Lecture en cours : {title}',
  'playButton.retry': 'Réessayer',
  'playButton.loading': 'Chargement',
  'playButton.pause': 'Pause',
  'playButton.play': 'Lecture',
  'progress.aria.label': 'Progression de la lecture',
  'progress.aria.valueText': '{current} sur {total}',
  'playTime.aria': 'Temps de lecture : {elapsed} sur {total}',
  'volume.aria': 'Volume',
  'settings.aria': 'Paramètres',
  'settings.download': 'Télécharger {label}',
  'settings.notDownloadable': 'Cette piste n’est pas téléchargeable.',
  'trackTitle.none': 'Aucune piste sélectionnée',
  'coverArt.none': 'Pas de pochette',
  'coverArt.alt': 'Pochette',
  'tracklist.aria': 'Liste des pistes',
  'waveform.aria': 'Forme d’onde audio',
  'notification.dismiss': 'Ignorer la notification',
  'uploader.notify.sessionExpired': 'Votre session de téléversement a expiré.',
  'uploader.notify.uploadSuccess': '{filename} téléversé avec succès',
  'uploader.notify.uploadFailed': '{filename} : échec du téléversement',
  'uploader.notify.networkError': '{filename} : erreur réseau',
  'uploader.notify.uploadFailedDetail': '{filename} : {error}',
  'uploader.notify.noAudioFiles': 'Aucun fichier audio détecté. Veuillez sélectionner des fichiers audio.',
  'uploader.error.tryAgain': 'Réessayer',
  'uploader.aria.loading': 'Chargement du téléverseur',
  'uploader.loadingText': 'Chargement…',
  'uploader.aria.fileArea': 'Zone de téléversement de fichiers',
  'uploader.dropHeading': 'Déposez des pistes audio dans la collection',
  'uploader.or': 'ou',
  'uploader.browseFiles': 'Parcourir les fichiers',
  'uploader.aria.selectFiles': 'Sélectionner des fichiers audio à téléverser',
  'uploader.aria.totalProgress': 'Progression totale du téléversement',
  'uploader.totalProgressText': '{percent}% au total',
  'uploader.aria.queue': 'File de téléversement',
  'uploader.aria.fileProgress': 'Progression du téléversement pour {filename}',
  'uploader.aria.retryFile': 'Réessayer le téléversement pour {filename}',
  'uploader.aria.cancelUpload': 'Annuler le téléversement pour {filename}',
  'uploader.aria.removeFile': 'Retirer le fichier {filename}',
}

const es: Messages = {
  'action.retry': 'Reintentar',
  'action.reload': 'Recargar',
  'player.notify.loadFailed': 'No se pudo cargar el reproductor.',
  'player.notify.sessionExpired': 'Tu sesión ha expirado.',
  'player.notify.noSession': 'No hay sesión de reproducción disponible',
  'player.notify.trackLoadFailed': 'No se pudo cargar esta pista.',
  'player.notify.playFailed': 'No se pudo reproducir esta pista.',
  'player.aria.loading': 'Cargando el reproductor de audio',
  'player.loadingText': 'Cargando el reproductor de audio…',
  'player.aria.region': 'Reproductor de audio',
  'player.status.playbackError': 'Error de reproducción',
  'player.status.buffering': 'Almacenando en búfer',
  'player.status.nowPlaying': 'Reproduciendo: {title}',
  'playButton.retry': 'Reintentar',
  'playButton.loading': 'Cargando',
  'playButton.pause': 'Pausa',
  'playButton.play': 'Reproducir',
  'progress.aria.label': 'Progreso de reproducción',
  'progress.aria.valueText': '{current} de {total}',
  'playTime.aria': 'Tiempo de reproducción: {elapsed} de {total}',
  'volume.aria': 'Volumen',
  'settings.aria': 'Ajustes',
  'settings.download': 'Descargar {label}',
  'settings.notDownloadable': 'Esta pista no se puede descargar.',
  'trackTitle.none': 'Ninguna pista seleccionada',
  'coverArt.none': 'Sin carátula',
  'coverArt.alt': 'Carátula',
  'tracklist.aria': 'Lista de pistas',
  'waveform.aria': 'Forma de onda de audio',
  'notification.dismiss': 'Descartar notificación',
  'uploader.notify.sessionExpired': 'Tu sesión de subida ha expirado.',
  'uploader.notify.uploadSuccess': '{filename} subido correctamente',
  'uploader.notify.uploadFailed': '{filename}: error al subir',
  'uploader.notify.networkError': '{filename}: error de red',
  'uploader.notify.uploadFailedDetail': '{filename}: {error}',
  'uploader.notify.noAudioFiles': 'No se detectaron archivos de audio. Selecciona archivos de audio.',
  'uploader.error.tryAgain': 'Intentar de nuevo',
  'uploader.aria.loading': 'Cargando el cargador',
  'uploader.loadingText': 'Cargando…',
  'uploader.aria.fileArea': 'Área de subida de archivos',
  'uploader.dropHeading': 'Suelta pistas de audio en la colección',
  'uploader.or': 'o',
  'uploader.browseFiles': 'Explorar archivos',
  'uploader.aria.selectFiles': 'Selecciona archivos de audio para subir',
  'uploader.aria.totalProgress': 'Progreso total de subida',
  'uploader.totalProgressText': '{percent}% en total',
  'uploader.aria.queue': 'Cola de subida',
  'uploader.aria.fileProgress': 'Progreso de subida de {filename}',
  'uploader.aria.retryFile': 'Reintentar la subida de {filename}',
  'uploader.aria.cancelUpload': 'Cancelar la subida de {filename}',
  'uploader.aria.removeFile': 'Quitar el archivo {filename}',
}

const de: Messages = {
  'action.retry': 'Wiederholen',
  'action.reload': 'Neu laden',
  'player.notify.loadFailed': 'Player konnte nicht geladen werden.',
  'player.notify.sessionExpired': 'Ihre Sitzung ist abgelaufen.',
  'player.notify.noSession': 'Keine Wiedergabesitzung verfügbar',
  'player.notify.trackLoadFailed': 'Dieser Titel konnte nicht geladen werden.',
  'player.notify.playFailed': 'Dieser Titel konnte nicht abgespielt werden.',
  'player.aria.loading': 'Audio-Player wird geladen',
  'player.loadingText': 'Audio-Player wird geladen…',
  'player.aria.region': 'Audio-Player',
  'player.status.playbackError': 'Wiedergabefehler',
  'player.status.buffering': 'Puffern',
  'player.status.nowPlaying': 'Wird abgespielt: {title}',
  'playButton.retry': 'Wiederholen',
  'playButton.loading': 'Wird geladen',
  'playButton.pause': 'Pause',
  'playButton.play': 'Abspielen',
  'progress.aria.label': 'Wiedergabefortschritt',
  'progress.aria.valueText': '{current} von {total}',
  'playTime.aria': 'Wiedergabezeit: {elapsed} von {total}',
  'volume.aria': 'Lautstärke',
  'settings.aria': 'Einstellungen',
  'settings.download': '{label} herunterladen',
  'settings.notDownloadable': 'Dieser Titel kann nicht heruntergeladen werden.',
  'trackTitle.none': 'Kein Titel ausgewählt',
  'coverArt.none': 'Kein Cover',
  'coverArt.alt': 'Cover',
  'tracklist.aria': 'Titelliste',
  'waveform.aria': 'Audio-Wellenform',
  'notification.dismiss': 'Benachrichtigung schließen',
  'uploader.notify.sessionExpired': 'Ihre Upload-Sitzung ist abgelaufen.',
  'uploader.notify.uploadSuccess': '{filename} erfolgreich hochgeladen',
  'uploader.notify.uploadFailed': '{filename}: Upload fehlgeschlagen',
  'uploader.notify.networkError': '{filename}: Netzwerkfehler',
  'uploader.notify.uploadFailedDetail': '{filename}: {error}',
  'uploader.notify.noAudioFiles': 'Keine Audiodateien erkannt. Bitte wählen Sie Audiodateien aus.',
  'uploader.error.tryAgain': 'Erneut versuchen',
  'uploader.aria.loading': 'Uploader wird geladen',
  'uploader.loadingText': 'Wird geladen…',
  'uploader.aria.fileArea': 'Datei-Upload-Bereich',
  'uploader.dropHeading': 'Audiotitel in die Sammlung ziehen',
  'uploader.or': 'oder',
  'uploader.browseFiles': 'Dateien durchsuchen',
  'uploader.aria.selectFiles': 'Audiodateien zum Hochladen auswählen',
  'uploader.aria.totalProgress': 'Gesamter Upload-Fortschritt',
  'uploader.totalProgressText': '{percent}% gesamt',
  'uploader.aria.queue': 'Upload-Warteschlange',
  'uploader.aria.fileProgress': 'Upload-Fortschritt für {filename}',
  'uploader.aria.retryFile': 'Upload für {filename} wiederholen',
  'uploader.aria.cancelUpload': 'Upload für {filename} abbrechen',
  'uploader.aria.removeFile': 'Datei {filename} entfernen',
}

const translations: Record<Locale, Messages> = { en, fr, es, de }

// Exposed primarily for completeness testing (every locale has every key).
export const catalogs: Readonly<Record<Locale, Readonly<Messages>>> = translations

// Normalize any input (e.g. "fr", "FR", "fr-CA", undefined) to a supported
// locale, defaulting to English when unknown.
export function resolveLocale (input?: string | null): Locale {
  if (!input) return DEFAULT_LOCALE
  const base = input.toLowerCase().split('-')[0]
  return (LOCALES as readonly string[]).includes(base ?? '')
    ? (base as Locale)
    : DEFAULT_LOCALE
}

// Translate a key for a locale, interpolating `{name}` placeholders. Falls back
// to English, then to the key itself, so missing translations never break the UI.
export function t (
  locale: string | Locale | undefined,
  key: MessageKey,
  params?: Record<string, string | number>
): string {
  const loc = resolveLocale(locale ?? undefined)
  const dict = translations[loc]
  let str = dict[key] ?? en[key] ?? key

  if (params) {
    for (const name of Object.keys(params)) {
      str = str.split(`{${name}}`).join(String(params[name]))
    }
  }

  return str
}
