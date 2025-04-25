import mitt from 'mitt'

const bus = mitt()
export const PORTAL_RESIZE = 'portal:table:resize'
export const DRAG_GRID_RESIZE = 'drag:grid:resize'
export default bus
