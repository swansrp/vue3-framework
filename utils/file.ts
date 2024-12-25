const fileTypeMapper = {
  'png': 'image',
  'jpg': 'image',
  'bmp': 'image',
  'gif': 'image',
  'jpeg': 'image',
  'webp': 'image',
  'svg': 'image',
  'tiff': 'image',
  'mp3': 'audio',
  'm3u': 'audio',
  'm4a': 'audio',
  'wav': 'audio',
  'wma': 'audio',
  'acc': 'audio',
  'flac': 'audio',
  'm4b': 'audio',
  'm4p': 'audio',
  'ogg': 'audio',
  'wmv': 'audio',
  'mp4': 'video',
  'mov': 'video',
  'mkv': 'video',
  'flv': 'video',
  'unknown': 'file',
}

export const getFileName = (url: string) => {
  return url.split('?').shift()?.split('/').pop()
}

export const getFileType = (url: string) => {
  const fileName = getFileName(url)
  const typeSuffix = fileName?.split('.').pop()?.toLowerCase()
  // @ts-ignore
  return fileTypeMapper[typeSuffix || 'unknown']
}