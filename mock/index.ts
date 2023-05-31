import {MockMethod} from "vite-plugin-mock"

const mock: Array<MockMethod> = [
    {
        url: '/api/getTopNavList',
        method: 'get',
        response: () => {
            return {
                status: {
                    code: 0,
                    msg: 'success',
                    detailMsg: '顶部导航列表'
                },
                payload: [
                    {
                        title: '经营平台',
                        key: 'business',
                        icon: 'MailOutlined',
                        path: 'business'
                    },
                    {
                        title: '管理平台',
                        key: 'manager',
                        icon: 'AppstoreOutlined',
                        path: 'manager',
                    },
                    {
                        title: '管理系统',
                        key: 'admin',
                        icon: 'SettingOutlined',
                        path: 'admin',
                        children: [
                            {
                                title: '财务管理系统',
                                key: 'finance',
                                icon: 'DollarOutlined',
                                path: 'finance'
                            },
                            {
                                title: '人事管理系统',
                                key: 'human',
                                icon: 'GoldOutlined',
                                path: 'human',
                            }
                        ]
                    },
                    {
                        title: 'OA系统',
                        key: 'OA',
                        icon: 'GlobalOutlined',
                        path: 'OA'
                    }
                ]
            }
        }
    },
    {
        url: '/api/getLeftNavList',
        method: 'get',
        response: () => {
            return {
                status: {
                    code: 0,
                    msg: 'success',
                    detailMsg: '左侧导航列表'
                },
                // 需要保证path和key完全相同，否则会有严重错误
                payload: [

                ]
            }
        }
    },
    {
        url: '/api/getSelectNameList',
        method: 'get',
        response: () => {
            return {
                status: {
                    code: 0,
                    msg: 'success',
                    detailMsg: '下拉搜索人名获取'
                },
                payload: [
                    { value: 'jack', label: 'Jack' },
                    { value: 'lucy', label: 'Lucy' },
                    { value: 'tom', label: 'Tom' }
                ]
            }
        }
    },
    {
        url: '/api/getCascadeAreaList',
        method: 'get',
        response: () => {
            return {
                status: {
                    code: 0,
                    msg: 'success',
                    detailMsg: '下拉搜索人名获取'
                },
                payload: [
                    {
                        label: 'Light',
                        value: 'light',
                        children: new Array(20)
                            .fill(null)
                            .map((_, index) => ({ label: `Number ${index}`, value: index })),
                    },
                    {
                        label: 'Bamboo',
                        value: 'bamboo',
                        children: [
                            {
                                label: 'Little',
                                value: 'little',
                                children: [
                                    {
                                        label: 'Toy Fish',
                                        value: 'fish',
                                    },
                                    {
                                        label: 'Toy Cards',
                                        value: 'cards',
                                    },
                                    {
                                        label: 'Toy Bird',
                                        value: 'bird',
                                    },
                                ],
                            },
                        ],
                    },
                ]
            }
        }
    },
    {
        url: '/api/getTableData',
        method: 'get',
        response: () => {
            return {
                status: {
                    code: 0,
                    msg: 'success',
                    detailMsg: '下拉表格数据'
                },
                payload: []
            }
        }
    },
]

export default mock
