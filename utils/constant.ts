export const MAIN_CONTENT = 'MainContent'
export const I_MAIN_CONTENT = ''
export const PHONE_NUMBER_RULE = /(^1(3|4|5|6|7|8|9)\d{9}$)|(^$)/
export const AUTO = 'auto'
export const ADD = 'add'
export const EDIT = 'edit'
export const LINK = 'link'
export const VIEW = 'view'
export const USER = 'user'
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_CURRENT_PAGE = 1
export const DEFAULT_PAGE_SIZE_OPTION = ['10', '20', '30', '40', '50']
export const ID_TOKEN = 'id_token'
export const REFRESH_TOKEN = 'refreshToken'
export const AUTHORIZATION_TOKEN = 'Authorization_token'

export const QUERY_INTERVAL = 350
export const CHANGE_TAB = 'changeTab'
export const COMPILE_TIME_FILE_PATH='./compileTime.json'

// 该标题的顶层菜单不在顶部菜单栏显示，改为在用户区齿轮下拉中提供入口（有权限时）
export const SYSTEM_MANAGE_MENU_TITLE = '系统管理'
// 同节点的路径键（墨枢 menu-seed 定稿 path: SystemManage）：嵌入态剥离该树时 path 主判、
// 标题兜底（标题被管理页改过也能命中，两键任一即认，见 framework/store/route.ts）
export const SYSTEM_MANAGE_MENU_PATH = 'SystemManage'

