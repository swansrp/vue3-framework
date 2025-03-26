export interface LogBoardReq {
    /** 模块id */
    moduleId: string;
    /** 环境类型 */
    envType: string;
    /** 日志等级 */
    logLevel?: string[];
    /** 请求id */
    requestId?: string;
    /** 跟踪id */
    traceId?: string;
    /** 请求ip */
    requestIP?: string;
    /** 用户ip */
    userIP?: string;
    /** 服务ip */
    serverIP?: string;
    /** 线程名称 */
    threadName?: string;
    /** 内容 */
    content?: string;
    /** 开始时间 */
    startAt?: string;
    /** 结束时间 */
    endAt?: string;
    /** 限制条数 */
    limit?: number;
}
