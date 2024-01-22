import {ColumnType, FIELD_TYPE, FILTER_TYPE} from '@/framework/components/common/Portal/type'

export const indexColumn = {
    title: '序号',
    dataIndex: 'index',
    key: 'index',
    showMenu: 'hover',
    align: 'center',
    fixed: 'left',
    editable: false,
    resizable: false,
    rowDrag: false,
    width: 80,
    filterAble: false,
    sorter: false,
    checked: true,
    disabled: true,
    addShow: false,
    detailShow: false,
    editShow: false
} as ColumnType

export const actionColumn = {
    title: '操作',
    dataIndex: 'actionColumn',
    key: 'actionColumn',
    showMenu: 'hover',
    align: 'center',
    fixed: 'right',
    editable: false,
    resizable: false,
    rowDrag: false,
    width: 150,
    filterAble: false,
    sorter: false,
    checked: true,
    disabled: true,
    addShow: false,
    detailShow: false,
} as ColumnType
export const defaultColumn = {
    title: '',
    dataIndex: '',
    key: '',
    showMenu: true,
    align: 'center',
    fixed: false,
    autoHeight: true,
    customFilterDropdown: false,
    resizable: true,
    rowDrag: false,
    editable: 'cellEditorSlot',
    referenceDictOption: [] as Array<any>,
    tooltip: {placement: 'topLeft', mouseEnterDelay: 0.5, overlayStyle: {}, popupStyle: {}},
    filterAble: false,
    sorter: false,
    checked: true,
    disabled: false,
    detailShow: false,
    addShow: false,
    detailSize: 1,
    addSize: 1,
    editSize: 1,
} as ColumnType

export const getDefaultFilterType = (fieldType: FIELD_TYPE) => {
    switch (fieldType) {
        case FIELD_TYPE.INPUT:
            return FILTER_TYPE.LIKE
        case FIELD_TYPE.SWITCH:
            return FILTER_TYPE.EQUAL
        case FIELD_TYPE.NUMBER:
            return FILTER_TYPE.EQUAL
        case FIELD_TYPE.SELECT:
            return FILTER_TYPE.IN
        case FIELD_TYPE.TREE:
            return FILTER_TYPE.IN
        case FIELD_TYPE.DATE:
            return FILTER_TYPE.BETWEEN
        case FIELD_TYPE.DATETIME:
            return FILTER_TYPE.BETWEEN
        default:
            return FILTER_TYPE.LIKE
    }
}
