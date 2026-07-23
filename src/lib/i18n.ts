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
  | 'uploader.notify.limitExceeded'
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
  | 'recorder.notify.sessionExpired'
  | 'recorder.notify.uploadSuccess'
  | 'recorder.notify.uploadFailed'
  | 'recorder.notify.networkError'
  | 'recorder.notify.uploadFailedDetail'
  | 'recorder.notify.micDenied'
  | 'recorder.notify.micUnavailable'
  | 'recorder.notify.maxDuration'
  | 'recorder.error.tryAgain'
  | 'recorder.aria.loading'
  | 'recorder.loadingText'
  | 'recorder.aria.region'
  | 'recorder.aria.start'
  | 'recorder.aria.pause'
  | 'recorder.aria.resume'
  | 'recorder.aria.stop'
  | 'recorder.aria.discard'
  | 'recorder.aria.send'
  | 'recorder.aria.cancelUpload'
  | 'recorder.aria.play'
  | 'recorder.aria.pausePreview'
  | 'recorder.aria.progress'
  | 'recorder.aria.done'
  | 'recorder.aria.cancelCountdown'
  | 'recorder.timer.preview'
  | 'recorder.idle.hint'
  | 'recorder.countdown.hint'
  | 'recorder.aria.selectMic'
  | 'recorder.device.unnamed'
  | 'recorder.device.menuLabel'
  | 'recorder.aria.moreOptions'
  | 'recorder.menu.preview'
  | 'recorder.menu.stopPreview'
  | 'recorder.menu.delete'
  | 'recorder.menu.stopUpload'

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
  'uploader.notify.limitExceeded': 'You can upload at most {limit} file(s).',
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
  'recorder.notify.sessionExpired': 'Your upload session expired.',
  'recorder.notify.uploadSuccess': 'Recording uploaded successfully',
  'recorder.notify.uploadFailed': 'Upload failed',
  'recorder.notify.networkError': 'Network error during upload',
  'recorder.notify.uploadFailedDetail': 'Upload failed: {error}',
  'recorder.notify.micDenied': 'Microphone access was denied.',
  'recorder.notify.micUnavailable': 'Microphone is not available.',
  'recorder.notify.maxDuration': 'Maximum recording length reached.',
  'recorder.error.tryAgain': 'Try again',
  'recorder.aria.loading': 'Loading recorder',
  'recorder.loadingText': 'Loading…',
  'recorder.aria.region': 'Voice recorder',
  'recorder.aria.start': 'Start recording',
  'recorder.aria.pause': 'Pause recording',
  'recorder.aria.resume': 'Resume recording',
  'recorder.aria.stop': 'Stop recording',
  'recorder.aria.discard': 'Discard recording',
  'recorder.aria.send': 'Confirm recording',
  'recorder.aria.cancelCountdown': 'Cancel countdown',
  'recorder.idle.hint': 'Tap to record',
  'recorder.countdown.hint': 'Get ready…',
  'recorder.aria.selectMic': 'Select microphone',
  'recorder.device.unnamed': 'Microphone {n}',
  'recorder.device.menuLabel': 'Microphones',
  'recorder.aria.moreOptions': 'More options',
  'recorder.menu.preview': 'Preview',
  'recorder.menu.stopPreview': 'Stop preview',
  'recorder.menu.delete': 'Delete',
  'recorder.menu.stopUpload': 'Stop upload',
  'recorder.aria.cancelUpload': 'Cancel upload',
  'recorder.aria.play': 'Play recording',
  'recorder.aria.pausePreview': 'Pause playback',
  'recorder.aria.progress': 'Upload progress',
  'recorder.aria.done': 'Upload complete',
  'recorder.timer.preview': '{current}/{total}',
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
  'uploader.notify.limitExceeded': 'Vous ne pouvez téléverser que {limit} fichier(s).',
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
  'recorder.notify.sessionExpired': 'Votre session de téléversement a expiré.',
  'recorder.notify.uploadSuccess': 'Enregistrement téléversé avec succès',
  'recorder.notify.uploadFailed': 'Échec du téléversement',
  'recorder.notify.networkError': 'Erreur réseau pendant le téléversement',
  'recorder.notify.uploadFailedDetail': 'Échec du téléversement : {error}',
  'recorder.notify.micDenied': 'L’accès au microphone a été refusé.',
  'recorder.notify.micUnavailable': 'Le microphone n’est pas disponible.',
  'recorder.notify.maxDuration': 'Durée maximale d’enregistrement atteinte.',
  'recorder.error.tryAgain': 'Réessayer',
  'recorder.aria.loading': 'Chargement de l’enregistreur',
  'recorder.loadingText': 'Chargement…',
  'recorder.aria.region': 'Enregistreur vocal',
  'recorder.aria.start': 'Démarrer l’enregistrement',
  'recorder.aria.pause': 'Mettre en pause',
  'recorder.aria.resume': 'Reprendre l’enregistrement',
  'recorder.aria.stop': 'Arrêter l’enregistrement',
  'recorder.aria.discard': 'Supprimer l’enregistrement',
  'recorder.aria.send': 'Confirmer l’enregistrement',
  'recorder.aria.cancelCountdown': 'Annuler le compte à rebours',
  'recorder.idle.hint': 'Appuyez pour enregistrer',
  'recorder.countdown.hint': 'Préparez-vous…',
  'recorder.aria.selectMic': 'Choisir le microphone',
  'recorder.device.unnamed': 'Microphone {n}',
  'recorder.device.menuLabel': 'Microphones',
  'recorder.aria.moreOptions': 'Plus d’options',
  'recorder.menu.preview': 'Écouter',
  'recorder.menu.stopPreview': 'Arrêter l’écoute',
  'recorder.menu.delete': 'Supprimer',
  'recorder.menu.stopUpload': 'Arrêter l’envoi',
  'recorder.aria.cancelUpload': 'Annuler le téléversement',
  'recorder.aria.play': 'Lire l’enregistrement',
  'recorder.aria.pausePreview': 'Mettre la lecture en pause',
  'recorder.aria.progress': 'Progression du téléversement',
  'recorder.aria.done': 'Téléversement terminé',
  'recorder.timer.preview': '{current}/{total}',
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
  'uploader.notify.limitExceeded': 'Solo puedes subir {limit} archivo(s).',
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
  'recorder.notify.sessionExpired': 'Tu sesión de subida ha expirado.',
  'recorder.notify.uploadSuccess': 'Grabación subida correctamente',
  'recorder.notify.uploadFailed': 'Error al subir',
  'recorder.notify.networkError': 'Error de red durante la subida',
  'recorder.notify.uploadFailedDetail': 'Error al subir: {error}',
  'recorder.notify.micDenied': 'Se denegó el acceso al micrófono.',
  'recorder.notify.micUnavailable': 'El micrófono no está disponible.',
  'recorder.notify.maxDuration': 'Se alcanzó la duración máxima de grabación.',
  'recorder.error.tryAgain': 'Intentar de nuevo',
  'recorder.aria.loading': 'Cargando el grabador',
  'recorder.loadingText': 'Cargando…',
  'recorder.aria.region': 'Grabador de voz',
  'recorder.aria.start': 'Iniciar grabación',
  'recorder.aria.pause': 'Pausar grabación',
  'recorder.aria.resume': 'Reanudar grabación',
  'recorder.aria.stop': 'Detener grabación',
  'recorder.aria.discard': 'Descartar grabación',
  'recorder.aria.send': 'Confirmar grabación',
  'recorder.aria.cancelCountdown': 'Cancelar cuenta atrás',
  'recorder.idle.hint': 'Toca para grabar',
  'recorder.countdown.hint': 'Prepárate…',
  'recorder.aria.selectMic': 'Seleccionar micrófono',
  'recorder.device.unnamed': 'Micrófono {n}',
  'recorder.device.menuLabel': 'Micrófonos',
  'recorder.aria.moreOptions': 'Más opciones',
  'recorder.menu.preview': 'Escuchar',
  'recorder.menu.stopPreview': 'Detener escucha',
  'recorder.menu.delete': 'Eliminar',
  'recorder.menu.stopUpload': 'Detener subida',
  'recorder.aria.cancelUpload': 'Cancelar subida',
  'recorder.aria.play': 'Reproducir grabación',
  'recorder.aria.pausePreview': 'Pausar reproducción',
  'recorder.aria.progress': 'Progreso de subida',
  'recorder.aria.done': 'Subida completa',
  'recorder.timer.preview': '{current}/{total}',
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
  'uploader.notify.limitExceeded': 'Sie können höchstens {limit} Datei(en) hochladen.',
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
  'recorder.notify.sessionExpired': 'Ihre Upload-Sitzung ist abgelaufen.',
  'recorder.notify.uploadSuccess': 'Aufnahme erfolgreich hochgeladen',
  'recorder.notify.uploadFailed': 'Upload fehlgeschlagen',
  'recorder.notify.networkError': 'Netzwerkfehler während des Uploads',
  'recorder.notify.uploadFailedDetail': 'Upload fehlgeschlagen: {error}',
  'recorder.notify.micDenied': 'Mikrofonzugriff wurde verweigert.',
  'recorder.notify.micUnavailable': 'Mikrofon ist nicht verfügbar.',
  'recorder.notify.maxDuration': 'Maximale Aufnahmedauer erreicht.',
  'recorder.error.tryAgain': 'Erneut versuchen',
  'recorder.aria.loading': 'Recorder wird geladen',
  'recorder.loadingText': 'Wird geladen…',
  'recorder.aria.region': 'Sprachrekorder',
  'recorder.aria.start': 'Aufnahme starten',
  'recorder.aria.pause': 'Aufnahme pausieren',
  'recorder.aria.resume': 'Aufnahme fortsetzen',
  'recorder.aria.stop': 'Aufnahme beenden',
  'recorder.aria.discard': 'Aufnahme verwerfen',
  'recorder.aria.send': 'Aufnahme bestätigen',
  'recorder.aria.cancelCountdown': 'Countdown abbrechen',
  'recorder.idle.hint': 'Tippen zum Aufnehmen',
  'recorder.countdown.hint': 'Bereit machen…',
  'recorder.aria.selectMic': 'Mikrofon auswählen',
  'recorder.device.unnamed': 'Mikrofon {n}',
  'recorder.device.menuLabel': 'Mikrofone',
  'recorder.aria.moreOptions': 'Weitere Optionen',
  'recorder.menu.preview': 'Anhören',
  'recorder.menu.stopPreview': 'Anhören stoppen',
  'recorder.menu.delete': 'Löschen',
  'recorder.menu.stopUpload': 'Upload stoppen',
  'recorder.aria.cancelUpload': 'Upload abbrechen',
  'recorder.aria.play': 'Aufnahme abspielen',
  'recorder.aria.pausePreview': 'Wiedergabe pausieren',
  'recorder.aria.progress': 'Upload-Fortschritt',
  'recorder.aria.done': 'Upload abgeschlossen',
  'recorder.timer.preview': '{current}/{total}',
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
