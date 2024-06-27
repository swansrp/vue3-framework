import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

export enum UPLOAD_FILE_TYPE {
  DOC = '1',
  IMG = '2',
  VIDEO = '3',
  APK = '4',
  AUDIO = '5',
  TEXT = '6',
  FILE = '7',
  WORD = '8',
  EXCEL = '9',
  PPT = '10',
  PDF = '11',
  LOG = '12',
  OTHER = '13'
}

export const getUploadFileType = (file: any) => {
  switch (file.type) {
    case 'text/plain':
      return UPLOAD_FILE_TYPE.TEXT
    case 'image/png':
    case 'image/jpeg':
      return UPLOAD_FILE_TYPE.IMG
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return UPLOAD_FILE_TYPE.WORD
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return UPLOAD_FILE_TYPE.EXCEL
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return UPLOAD_FILE_TYPE.PPT
    case 'application/pdf':
      return UPLOAD_FILE_TYPE.PDF
    case 'application/x-zip-compressed':
      return UPLOAD_FILE_TYPE.FILE
    default:
      return UPLOAD_FILE_TYPE.OTHER
  }
}

export const getUploadAccepts = (fieldType: string) => {
  switch (fieldType) {
    case FIELD_TYPE.AUDIO:
      return '.m4a,.mp3,.wav,.wma'
    case FIELD_TYPE.VIDEO:
      return '.mp4,.mkv,.wmv,.avi'
    case FIELD_TYPE.IMAGE:
      return '.jpg,.png,.bmp,.gif,.jpeg'
    default:
      return fieldType
  }
}
