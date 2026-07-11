export function formatDuration (durationSeconds: number): string {
  if (durationSeconds === undefined) return '--:--'

  const m = Math.floor(durationSeconds / 60) || 0
  const s = Math.round(durationSeconds % 60) || 0

  return `${m}:${('' + s).padStart(2, '0')}`
}

export function formatDurationTimestamp (durationSeconds: number): string {
  if (durationSeconds === undefined) return '0s'

  const m = Math.floor(durationSeconds / 60) || 0
  const s = Math.round(durationSeconds % 60) || 0

  return [
    m && m + 'm',
    s && s + 's'
  ].join(' ')
}

export function formatBytes (bytes: number, decimals: number = 2): string {
  if (!+bytes) return '0 Bytes'

  const k = 1000
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
