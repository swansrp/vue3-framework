export interface LogInfo {
    // id
    logId: number;
    // 序号
    logSeq: number;
    // 日志级别
    logLevel: string;
    // 日志时间（日期类型）
    createTime: Date;
    // 类名
    className: string;
    // 方法名
    methodName: string;
    // 请求上下文ID
    requestId: string;
    // 日志内容
    content: string;
    // 线程名
    threadName: string;
}
