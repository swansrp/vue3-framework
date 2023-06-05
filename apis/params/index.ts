import {request} from "@/framework/network/request";
import {buildGetApiByType} from "@/framework/apis";
import {apiType} from "@/framework/apis";

const buildGetApi = (url: string) => buildGetApiByType(url, apiType.config)

export const getConfig = (configKey: string) => request(buildGetApi(""), {configKey}) as Promise<any>


