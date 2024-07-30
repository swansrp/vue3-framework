export const invoke = (funcName: string, arg: any) => {
  if ((window as any).weapp?.inE10APP() || (window as any).weapp?.inE10Pc()) {
    ;(window as any).weapp?.ready(() => {
      if ((window as any).weapp.checkJsApi(funcName)) {
        ;(window as any).weapp.invoke(funcName, arg)
      }
    })
  }
}
/**
 * 横屏
 */
export const landscapeInApp = () => {
  if ((window as any).weapp?.inE10APP()) {
    invoke('changeOrientation', {
      orientation: '1', // 横屏
      success: (res: any) => {
        console.log(res)
      },
      fail: (err: any) => {
        console.log(err)
      }
    })
  }
}
/**
 * 获取标题栏颜色
 */
export const getNaviBarColor = (onSuccess: (arg: any) => void) => {
  if ((window as any).weapp?.inE10APP()) {
    invoke('getNavColor', {
      success: (res: any) => {
        onSuccess(res)
      },
      fail: (err: any) => {
        console.log(err)
      }
    })
  }
}
