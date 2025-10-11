export const convertImgToBase64 = (imgUrl: string) => {
  return new Promise<string>((resolve) => {
    const imgDom = document.createElement('img')
    imgDom.src = imgUrl
    imgDom.crossOrigin = 'anonymous' //支持跨域
    imgDom.onload = () => {
      resolve(getBase64Image(imgDom))
    }
  })
}

//通过canvas转base64
const getBase64Image = (img: any) => {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  ctx && ctx.drawImage(img, 0, 0, img.width, img.height)
  return canvas.toDataURL('image/png')
}

export const downloadFileByBase64 = (base64: string, fileName: string) => {
  const myBlob = dataURLtoBlob(base64)
  const myUrl = URL.createObjectURL(myBlob)
  downloadFile(myUrl, fileName)
}

// * desc: 下载方法
// * @param url  ：返回数据的blob对象或链接
// * @param fileName  ：下载后文件名标记
const downloadFile = (url: string, name: string) => {
  const a = document.createElement('a')
  a.setAttribute('href', url)
  a.setAttribute('download', name)
  a.setAttribute('target', '_blank')
  const clickEvent = document.createEvent('MouseEvents')
  clickEvent.initEvent('click', true, true)
  a.dispatchEvent(clickEvent)
}

const dataURLtoBlob = (dataUrl: string) => {
  const arr = dataUrl.split(',')
  //@ts-ignore
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}