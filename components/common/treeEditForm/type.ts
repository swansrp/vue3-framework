interface FormState {
    title: string
    icon: string
    isCache: boolean | number
    isFrame: boolean | number
    path: string
    query: string
    component: string
    pid: number | undefined
    grandId: number | undefined,
    menuId: undefined
}

type FormType = 'edit' | 'add'

export type { FormState, FormType }
