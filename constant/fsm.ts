export enum SM_STATE_TYPE {
  //初始化
  INIT = '1',
  //暂存
  DRAFT = '2',
  //待审核
  START = '3',
  //通过
  PASS = '4',
  //拒绝
  REJECT = '5',
  //关闭
  CLOSE = '6',
  //完成
  FINISH = '7',
}

export enum APPROVAL_TYPE {
  UNKNOWN = '0', //"未提交
  APPLY = '1', //"待审核
  REJECT = '2', //"未通过
  APPROVAL = '3', //"已通过
}

export enum ACTIVATE_TYPE {
  ACTIVATE = '1', //"已启用
  PENDING = '2', //"待启用
  DEACTIVATE = '0', //"已停用
  LOCKING = '3', //已锁定
}