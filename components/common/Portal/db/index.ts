import Database from '../../../../db'

export const db = new Database('PortalConfigDB')

db.version(1).stores({
  portalColumn: '[tableId+dataIndex], dataIndex, order'
})

