interface DictDateType {
    label: string
    value: string
}

type DictConfigItemType = 'currentConfig' | 'addDict' | ''

interface DataItem {
    key: string
    index: number
    dictValue: string
    dictLabel: string
    dictSort: number
    isDefault: string
}

export type {DictDateType, DictConfigItemType, DataItem}
