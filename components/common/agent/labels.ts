/**
 * 框架注册工具的展示标签正源（工具卡人话名＋关键参数摘要字段）
 *
 * 只认框架工具（sandbox_* / 附件与产物读写 / askUser / finish / *ExternalTask）；
 * 🔴 业务工具的人话名由宿主经 useAgentConversation options.toolLabels / AgentPane prop
 * tool-labels 注入（注入表优先于本表命中）——框架仓不认业务名（反向耦合已拔除）。
 * 框架新增注册工具时同步这里，否则工具卡回落原名。
 *
 * 另：processFlow.FRAMEWORK_STEP_LABELS（步骤行口径，如 askUser=「向用户追问」）与
 * processTree.TOOL_LABELS（relay 引擎工具 terminal/browser 等）是各自的视图口径表，
 * 均不含业务名，不在本表收敛范围。
 */

/** 工具名 → 人话名（工具卡标签；未知工具回落原名） */
export const FRAMEWORK_TOOL_LABELS: Record<string, string> = {
  sandbox_run: '沙箱执行',
  sandbox_fetch: '取回沙箱产物',
  sandbox_put_attachment: '放入沙箱原件',
  read_attachment: '读取附件',
  read_file: '读取附件',
  generate_artifact: '生成产物文件',
  upload_file: '上传产物文件',
  askUser: '向用户提问',
  finish: '收口',
  submitExternalTask: '委托外部执行',
  waitExternalTask: '等待外部结果',
  queryExternalTask: '查询外部任务',
  readExternalTaskResult: '读取外部结果',
  cancelExternalTask: '终止外部任务'
}

/** 各工具的关键参数字段（按序取第一个非空值作摘要；均缺省回落全文摘要） */
export const FRAMEWORK_TOOL_DIGEST_FIELDS: Record<string, string[]> = {
  sandbox_run: ['command'],
  sandbox_fetch: ['rel_path', 'relPath', 'file_path', 'filePath', 'path'],
  sandbox_put_attachment: ['path', 'file_id'],
  read_attachment: ['name', 'file_name', 'fileName', 'file_id', 'fileId'],
  read_file: ['name', 'file_name', 'fileName', 'file_id', 'fileId'],
  generate_artifact: ['file_name', 'fileName', 'name', 'format'],
  upload_file: ['object_name', 'objectName', 'name'],
  askUser: ['question'],
  submitExternalTask: ['title', 'task', 'prompt'],
  waitExternalTask: ['task_id', 'taskId'],
  queryExternalTask: ['task_id', 'taskId'],
  readExternalTaskResult: ['task_id', 'taskId'],
  cancelExternalTask: ['task_id', 'taskId']
}
