// 七类语义层资产的结构化编辑配置：root 形态 + 列编辑器（与后端 layer Def 类 snake_case 字段一一对应）

export interface AssetColumn {
  key: string
  title: string
  width?: number
  // input / select / tags / switch / modal（子弹表弹窗）/ fieldSelect（同行 fields 取项）/ assetSelect（兄弟资产取项）
  editor: 'input' | 'select' | 'tags' | 'switch' | 'modal' | 'fieldSelect' | 'assetSelect'
  options?: Array<{ label: string; value: string }>
  // 卡片布局中独占整行并用 textarea（长文本：公式/表名/说明等）
  full?: boolean
  // fieldSelect 多选（如主键）；assetSelect 同样支持多选（如支持维度）
  multiple?: boolean
  // assetSelect 专用：选项来源的兄弟资产类型（如 supported_dimensions 取 dimensions 草稿）
  source?: string
  // modal 编辑器专用：子弹表列与新增行模板
  modalTitle?: string
  modalColumns?: AssetColumn[]
  modalDefault?: Record<string, any>
}

export interface AssetShape {
  // array=顶层数组；map=domains 映射（码值域）；object=包裹对象（concepts/sensitive-fields）
  root: 'array' | 'map' | 'object'
  // root=object 时的数组字段名；root=map 时的映射字段名
  listKey?: string
  columns: AssetColumn[]
  defaultRow: Record<string, any>
  // 无草稿时的空稿模板
  emptyTemplate: any
  hint?: string
}

// 实体字段弹窗列：敏感治理统一走「敏感字段」资产逐表声明（tables[]），
// 字段级不设敏感开关，避免双口径冲突（旧 sensitive/code_field 列已移除，运行期也未消费）
const FIELD_MODAL_COLUMNS: AssetColumn[] = [
  { key: 'name', title: '字段名', width: 140, editor: 'input' },
  { key: 'display_name', title: '显示名', width: 130, editor: 'input' },
  {
    key: 'type', title: '类型', width: 110, editor: 'select',
    options: ['String', 'Integer', 'Decimal', 'Double', 'Date'].map(t => ({ label: t, value: t }))
  },
  { key: 'value_domain', title: '码值域', width: 120, editor: 'input' }
]

export const ASSET_SHAPES: Record<string, AssetShape> = {
  entities: {
    root: 'array',
    columns: [
      { key: 'name', title: '实体名', width: 140, editor: 'input' },
      { key: 'display_name', title: '显示名', width: 130, editor: 'input' },
      { key: 'table', title: '物理表（db.tbl）', editor: 'input', full: true },
      { key: 'primary_key', title: '主键', width: 150, editor: 'fieldSelect', multiple: true },
      { key: 'listable', title: '可列表', width: 70, editor: 'switch' },
      { key: 'time_field', title: '时间窗字段', width: 110, editor: 'fieldSelect' },
      { key: 'certified', title: '已认证', width: 70, editor: 'switch' },
      {
        key: 'fields', title: '字段', width: 80, editor: 'modal', modalTitle: '实体字段',
        modalColumns: FIELD_MODAL_COLUMNS,
        modalDefault: { name: '', display_name: '', type: 'String' }
      }
    ],
    defaultRow: { name: '', display_name: '', table: '', fields: [], listable: true, certified: false },
    emptyTemplate: [],
    hint: 'default_filters 等高级约束请用 JSON 模式编辑'
  },
  metrics: {
    root: 'array',
    columns: [
      { key: 'name', title: '指标名', width: 140, editor: 'input' },
      { key: 'display_name', title: '显示名', width: 110, editor: 'input' },
      {
        key: 'type', title: '类型', width: 100, editor: 'select',
        // 存储值保持 atomic/derived/composite（后端 SQL 生成与校验硬依赖），仅标签中文化
        options: [
          { label: '原子指标（单表直接聚合）', value: 'atomic' },
          { label: '派生指标（由其他指标派生）', value: 'derived' },
          { label: '复合指标（多表跨源组合）', value: 'composite' }
        ]
      },
      { key: 'aliases', title: '别名', width: 140, editor: 'tags' },
      { key: 'formula', title: '聚合公式', editor: 'input', full: true },
      { key: 'source_table', title: '源表', width: 190, editor: 'input' },
      { key: 'supported_dimensions', title: '支持维度', width: 170, editor: 'assetSelect', source: 'dimensions', multiple: true },
      { key: 'certified', title: '已认证', width: 70, editor: 'switch' },
      { key: 'depends_on', title: '依赖指标', width: 150, editor: 'assetSelect', source: 'metrics', multiple: true },
      { key: 'time_field', title: '时间轴字段', width: 110, editor: 'input' }
    ],
    defaultRow: { name: '', display_name: '', type: 'atomic', formula: '', certified: true },
    emptyTemplate: [],
    hint: 'description/source_tables 等字段请用 JSON 模式编辑'
  },
  dimensions: {
    root: 'array',
    columns: [
      { key: 'name', title: '维度名', width: 150, editor: 'input' },
      { key: 'display_name', title: '显示名', width: 130, editor: 'input' },
      { key: 'aliases', title: '口语别名', width: 150, editor: 'tags' },
      { key: 'expression', title: '列引用（db.tbl.col）', editor: 'input', full: true },
      {
        key: 'type', title: '类型', width: 100, editor: 'select',
        options: [{ label: 'time', value: 'time' }]
      },
      {
        key: 'match', title: '匹配方式', width: 130, editor: 'select',
        options: [
          { label: '等值（默认）', value: '' },
          { label: '多值（FIND_IN_SET）', value: 'multi' }
        ]
      },
      { key: 'certified', title: '已认证', width: 70, editor: 'switch' }
    ],
    defaultRow: { name: '', display_name: '', expression: '', certified: false },
    emptyTemplate: []
  },
  relations: {
    root: 'array',
    columns: [
      { key: 'name', title: '关系名', width: 180, editor: 'input' },
      { key: 'from_entity', title: 'From 实体', width: 140, editor: 'input' },
      { key: 'to_entity', title: 'To 实体', width: 140, editor: 'input' },
      {
        key: 'type', title: '关系类型', width: 130, editor: 'select',
        options: ['many_to_one', 'one_to_many', 'one_to_one', 'many_to_many'].map(t => ({ label: t, value: t }))
      },
      {
        key: 'join', title: 'JOIN 键', width: 90, editor: 'modal', modalTitle: 'JOIN 键',
        modalColumns: [
          { key: 'left', title: '左列（from 实体）', width: 180, editor: 'input' },
          { key: 'right', title: '右列（to 实体）', width: 180, editor: 'input' }
        ],
        modalDefault: { left: '', right: '' }
      },
      { key: 'certified', title: '已认证', width: 70, editor: 'switch' },
      { key: 'notes', title: '说明', editor: 'input', full: true }
    ],
    defaultRow: { name: '', from_entity: '', to_entity: '', type: 'many_to_one', join: [], certified: true },
    emptyTemplate: []
  },
  'value-domains': {
    root: 'map',
    listKey: 'domains',
    columns: [
      { key: '_key', title: '码值域键', width: 150, editor: 'input' },
      { key: 'entity', title: '实体', width: 140, editor: 'input' },
      { key: 'field', title: '字段', width: 130, editor: 'input' },
      {
        key: 'stored_as', title: '存储方式', width: 100, editor: 'select',
        options: [{ label: 'code', value: 'code' }, { label: 'label', value: 'label' }]
      },
      {
        key: 'values', title: '码值', width: 80, editor: 'modal', modalTitle: '码值清单',
        modalColumns: [
          { key: 'code', title: '码值', width: 140, editor: 'input' },
          { key: 'label', title: '业务标签', width: 140, editor: 'input' },
          { key: 'aliases', title: '口语别名', width: 180, editor: 'tags' }
        ],
        modalDefault: { code: '', label: '' }
      },
      { key: 'certified', title: '已认证', width: 70, editor: 'switch' }
    ],
    defaultRow: { _key: '', entity: '', field: '', stored_as: 'label', values: [], certified: false },
    emptyTemplate: { schema_version: '1.0', domains: {} }
  },
  concepts: {
    root: 'object',
    listKey: 'concepts',
    columns: [
      { key: 'name', title: '概念名', width: 130, editor: 'input' },
      { key: 'aliases', title: '别名', width: 150, editor: 'tags' },
      { key: 'entity', title: '实体', width: 140, editor: 'input' },
      { key: 'expands_to.dimension', title: '展开维度', width: 120, editor: 'input' },
      {
        key: 'expands_to.operator', title: '操作符', width: 90, editor: 'select',
        options: ['=', '!=', 'in', 'not in', 'like'].map(o => ({ label: o, value: o }))
      },
      { key: 'expands_to.value', title: '展开值', width: 120, editor: 'input' },
      { key: 'certified', title: '已认证', width: 70, editor: 'switch' },
      { key: 'note', title: '说明', editor: 'input', full: true }
    ],
    defaultRow: { name: '', aliases: [], entity: '', expands_to: { dimension: '', operator: '=', value: '' }, certified: true },
    emptyTemplate: { schema_version: '1.0', concepts: [], hierarchy: [] },
    hint: '概念表格维护业务术语别名；分级目录 hierarchy 用下方「维度分组目录」面板维护（组名下拉常用类别+成员从维度草稿点选，应用后保存即落草稿）；'
      + 'LLM 生成概念时会按业务域自动赋组（超过 60 个支持维度时问数目录改回分组摘要两级导航），'
      + '未入组维度自动落「其他」组，分组只影响目录回显不影响指标口径'
  },
  // 敏感字段 tab 由 AgentAssetEdit 逐表治理面板接管（tables[] 形态），此配置仅供 JSON 模式/下载兼容
  'sensitive-fields': {
    root: 'object',
    listKey: 'tables',
    columns: [
      { key: 'entity', title: '实体', width: 150, editor: 'input' },
      { key: 'no_sensitive', title: '无敏感字段', width: 110, editor: 'switch' },
      { key: 'fields', title: '敏感列（JSON 模式维护）', editor: 'input', full: true }
    ],
    defaultRow: { entity: '', no_sensitive: false, fields: [] },
    emptyTemplate: { schema_version: '1.0', tables: [] },
    hint: '逐表声明：每表或标记敏感列（field + 可选 replace_field 替换列）或声明 no_sensitive；参照 chat bi 敏感列：值域不外泄，条件查询走替换列'
  },
  // 行级权限：按表声明行过滤策略，引擎渲染期注入 WHERE（参数化绑定，查询方不可见不可绕过）
  'row-policies': {
    root: 'object',
    listKey: 'tables',
    columns: [
      { key: 'table', title: '物理表（db.tbl）', width: 220, editor: 'input' },
      {
        key: 'policies', title: '行权限策略', width: 110, editor: 'modal', modalTitle: '行权限策略',
        modalColumns: [
          { key: 'column', title: '过滤列', width: 150, editor: 'input' },
          {
            key: 'op', title: '操作符', width: 130, editor: 'select',
            options: [
              { label: '= 等于', value: '=' },
              { label: '!= 不等于', value: '!=' },
              { label: '> 大于', value: '>' },
              { label: '>= 大于等于', value: '>=' },
              { label: '< 小于', value: '<' },
              { label: '<= 小于等于', value: '<=' },
              { label: 'IN 在列表内', value: 'in' },
              { label: 'NOT IN 不在列表内', value: 'not_in' }
            ]
          },
          { key: 'value', title: '值（常量或 ${user.xxx} 登录态模板）', width: 240, editor: 'input' },
          { key: 'desc', title: '说明', editor: 'input' }
        ],
        modalDefault: { column: '', op: '=', value: '', desc: '' }
      }
    ],
    defaultRow: { table: '', policies: [] },
    emptyTemplate: { schema_version: '1.0', tables: [] },
    hint: 'value 支持登录态模板：${user.customerNumber}(工号)/${user.id}/${user.name}/${user.attr.KEY}；in/not_in 须数组（JSON 模式维护）；渲染期注入 WHERE 并参数化绑定，查询方不可见；配了策略的表在无登录态链路将拒绝生成（fail-closed）'
  }
}
