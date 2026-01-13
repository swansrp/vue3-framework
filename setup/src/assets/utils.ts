export const getImgs = (icon_name: string) => new URL('./' + icon_name, import.meta.url).href
