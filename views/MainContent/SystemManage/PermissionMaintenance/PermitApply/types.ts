export interface PermitApplyMenuTreeItem {
  waitApproveCount: number
  menuId: number
  pid: number
  key: number
  grandId: number
  title: string
  icon?: string
  children?: PermitApplyMenuTreeItem[]
}

export interface PermitApplyMenuTreeRes extends PermitApplyMenuTreeItem {
  children: PermitApplyMenuTreeRes[]
}

export interface PermitApplyRecord {
  id: number | string
  applicant: string
  applicantName: string
  menuId: number
  menuName: string
  applyReason: string
  applyTime: string
  status: 'pending' | 'approved' | 'rejected'
  approver?: string
  approveTime?: string
}

export interface PortalActionSlotProps {
  record: PermitApplyRecord
  index: number
}