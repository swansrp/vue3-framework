// 权限主体数据加载 composable
// 角色 / 用户组（按类型分组的树）/ 部门 三类主体数据的统一加载，供正向与反向配置复用

import { reactive, ref } from 'vue'

import { getRoleList } from '@/framework/apis/admin/rolePermission'
import { getUserGroupById, getUserGroupType } from '@/framework/apis/admin/userGroup'
import { getDepartmentTree } from '@/framework/components/common/departmentAndStaffSelect/api'

export function useSubjectData() {
  // 角色
  const roleList = ref<any[]>([])
  // 用户组：类型列表 + 按类型的树 + 扁平列表（用于名称回显）
  const groupTypeList = ref<any[]>([])
  const groupTreeMap = reactive<Record<string, any[]>>({})
  const groupList = ref<any[]>([])
  // 部门树
  const deptTree = ref<any[]>([])

  // 收集树中所有节点 id
  const collectAllIds = (nodes: any[]): any[] => {
    const ids: any[] = []
    const walk = (list: any[]) => {
      for (const n of list) {
        ids.push(n.id)
        if (n.children) walk(n.children)
      }
    }
    walk(nodes || [])
    return ids
  }

  const loadRoles = async () => {
    try {
      const res = await getRoleList()
      roleList.value = res.payload?.records || []
    } catch (e) {
      console.error('加载角色列表失败', e)
    }
  }

  const loadGroups = async () => {
    try {
      const typeRes = await getUserGroupType()
      groupTypeList.value = typeRes.payload || []
      const flatList: any[] = []
      const walk = (nodes: any[]) => {
        for (const node of nodes) {
          flatList.push(node)
          if (node.children) walk(node.children)
        }
      }
      await Promise.all(
        groupTypeList.value.map((t: any) =>
          getUserGroupById(t.id)
            .then((res: any) => {
              const tree = res.payload || []
              groupTreeMap[t.id] = tree
              walk(tree)
            })
            .catch(() => {})
        )
      )
      groupList.value = flatList
    } catch (e) {
      console.error('加载用户组失败', e)
    }
  }

  const loadDepts = async () => {
    try {
      const res = await getDepartmentTree()
      deptTree.value = res.payload || []
    } catch (e) {
      console.error('加载部门树失败', e)
    }
  }

  const loadAll = () => Promise.all([loadRoles(), loadGroups(), loadDepts()])

  return {
    roleList,
    groupTypeList,
    groupTreeMap,
    groupList,
    deptTree,
    collectAllIds,
    loadRoles,
    loadGroups,
    loadDepts,
    loadAll
  }
}

export type SubjectData = ReturnType<typeof useSubjectData>
