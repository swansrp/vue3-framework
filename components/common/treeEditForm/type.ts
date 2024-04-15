interface FormState {
    title: string
    icon: string
    isCache: boolean | number
    isFrame: boolean | number
    menuType: number
    path: string
    query: string
    component: string
    pid: number | undefined
    grandId: number | undefined,
    menuId: undefined
}

type FormType = 'edit' | 'add_menu' | 'add_button'

export type { FormState, FormType }
