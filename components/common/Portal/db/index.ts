import db from '../../../../db'

db.version(1).stores({
  portalColumn: '[tableName+dataIndex], dataIndex, order'
})