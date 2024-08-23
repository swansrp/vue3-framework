import {Method} from 'axios'

declare global {
    // 因为不能保证所有的浏览器都可以使用msSaveBlob，所以需要定义Navigator的类型
    // 作用与/utils/request.ts文件中的_download函数
    interface Navigator {
        msSaveBlob?: (blob: any, defaultName?: string) => boolean
    }

    interface ApiType {
        baseDomain: string,
        url: string
        method: Method,
        version: string,
    }

    interface configDataType {
        data: object,
        showLoading: boolean
    }

    interface ResponseDataType {
        status: {
            code: number, msg: string, detailMsg: string
        },
        payload: {
            ssoLoginUrl?: string
        }
    }
}


export interface ValueLabel {
    value: string | number
    label: string,
    option?: any
}

export type ValueLabelArray = Array<ValueLabel>

export interface StaffBaseSelectType extends ValueLabel {
    pictureLink?: string,
    deptName?: string,
    customerNumber?: string
}

export type StaffBaseSelectArrayType = Array<StaffBaseSelectType>

export interface IdName {
    id: string
    name: string
}

export type IdNameArray = Array<IdName>

export interface CompanyIdName {
    companyId: string
    companyName: string
}

export type CompanyArray = Array<CompanyIdName>

export interface EmptyObjectType {
    [key: string | number]: string | number | boolean | Array<any>
}

export type TimerType = { timer: any, lastTime: number, diff: number }
