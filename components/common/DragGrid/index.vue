<template>
  <grid-layout
    v-model:layout="list"
    :col-num="maxCol"
    :is-draggable="isDraggable"
    :row-height="rowHeight"
    @layout-updated="layoutUpdated"
    @layout-ready="layoutReady"
  >
    <grid-item
      v-for="item in list"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :is-resizable="false"
      :w="item.w"
      :x="item.x"
      :y="item.y"
      @move="moveEvent"
    >
      <slot
        :item="item"
        name="render"
      ></slot>
    </grid-item>
  </grid-layout>
</template>

<script lang="ts" setup>
import { GridItem, GridLayout } from 'grid-layout-plus'
import { LayoutItem } from 'grid-layout-plus/src/helpers/types'

import bus, { DRAG_GRID_RESIZE } from '@/framework/mitt'
const list = ref([] as Array<any>)
const props = withDefaults(
    defineProps<{
      modelValue: any
      width?: number
      height?: number
      maxCol?: number
      fieldNames?: any
      rowHeight?: number
      isDraggable?: boolean
    }>(),
    {
      width: 3,
      height: 10,
      maxCol: 12,
      fieldNames: { label: 'label', value: 'value' },
      rowHeight: 31,
      isDraggable: true
    }
)
const { modelValue, width, height, maxCol, fieldNames, rowHeight } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'moved', value: any): void
}>()
const getNode = (position: number, data: any, x: number, y: number) => {
  return {
    x: x * width.value,
    y: y * height.value,
    w: width.value,
    h: height.value,
    i: data[fieldNames.value.value],
    label: data[fieldNames.value.label],
    position,
    static: false,
    data
  } as LayoutItem
}
const map = new Map()
const positionMap = new Map()
let currentMovedNode: {i: string, newX: number, newY: number} | null = null
function moveEvent(i: string, newX: number, newY: number) {
  if (map.get(i).y > newY) {
    map.get(i).direction = -1
  } else if (map.get(i).y < newY) {
    map.get(i).direction = 1
  } else {
    if (map.get(i).x > newX) {
      map.get(i).direction = -1
    } else if (map.get(i).x < newX) {
      map.get(i).direction = 1
    } else {
      map.get(i).direction = 0
    }
  }
  currentMovedNode = { i, newX, newY }
}
function layoutReady(): void {
  nextTick(() => {
    bus.emit(DRAG_GRID_RESIZE)
  })
}
function layoutUpdated() {
  console.debug('layout-updated', currentMovedNode)
  if(!currentMovedNode) return
  const { i, newX } = currentMovedNode
  nextTick(() => {
    if (map.get(i).direction !== 0) {
      if (map.get(i).direction > 0) {
        map.get(i).node.x = Math.ceil(newX / width.value) * width.value
      } else {
        map.get(i).node.x = Math.floor(newX / width.value) * width.value
      }
    }

    let position = getPosition(map.get(i).node.x, map.get(i).node.y)
    if(position >= list.value.length) {
      position = list.value.length - 1
      if(map.get(i).node.position === list.value.length - 1) {
        map.get(i).node.x = map.get(i).x
        map.get(i).node.y = map.get(i).y
      } else {
        const { x, y } = positionMap.get(position)
        map.get(i).node.x = x
        map.get(i).node.y = y
      }
    }
    console.log(0, i, map.get(i).node.label, '(' + map.get(i).x + ', ' + map.get(i).y + ')->(' + map.get(i).node.x + ', ' + map.get(i).node.y + ') ',
        map.get(i).node.position + '->' + position + ' ' + 'direction: ' + map.get(i).direction)
    if (map.get(i).direction > 0) {
      for (let index = 0; index < map.get(i).node.position; index++) {
        const { x, y } = positionMap.get(index)
        console.log(1, index, positionMap.get(index).label, '(' + positionMap.get(index).x + ', ' + positionMap.get(index).y + ')->(' + x + ', ' + y + ') ',
            positionMap.get(index).position + '->' + index)
        positionMap.get(index).x = x
        positionMap.get(index).y = y
        positionMap.get(index).position = index
      }
      for (let index = map.get(i).node.position; index < position; index++) {
        const { x, y } = map.get(positionMap.get(index).i)
        console.log(2, index + 1, positionMap.get(index + 1).label, '(' + positionMap.get(index + 1).x + ', ' + positionMap.get(index + 1).y + ')->(' + x + ', ' + y + ') ',
            positionMap.get(index + 1).position + '->' + index)
        positionMap.get(index + 1).x = x
        positionMap.get(index + 1).y = y
        positionMap.get(index + 1).position = index
      }
      for (let index = position + 1; index < list.value.length; index++) {
        const { x, y } = positionMap.get(index)
        console.log(3, index, positionMap.get(index).label, '(' + positionMap.get(index).x + ', ' + positionMap.get(index).y + ')->(' + x + ', ' + y + ') ',
            positionMap.get(index).position + '->' + index)
        positionMap.get(index).x = x
        positionMap.get(index).y = y
        positionMap.get(index).position = index
      }
    } else {
      for (let index = 0; index < position; index++) {
        const { x, y } = positionMap.get(index)
        console.log(4, index, positionMap.get(index).label, '(' + positionMap.get(index).x + ', ' + positionMap.get(index).y + ')->(' + x + ', ' + y + ') ',
            positionMap.get(index).position + '->' + index)
        positionMap.get(index).x = x
        positionMap.get(index).y = y
        positionMap.get(index).position = index
      }
      for (let index = map.get(i).node.position; index > position; index--) {
        const { x, y } = map.get(positionMap.get(index).i)
        console.log(5, index - 1, positionMap.get(index - 1).label, '(' + positionMap.get(index - 1).x + ', ' + positionMap.get(index - 1).y + ')->(' + x + ', ' + y + ') ',
            positionMap.get(index - 1).position + '->' + index)
        positionMap.get(index - 1).x = x
        positionMap.get(index - 1).y = y
        positionMap.get(index - 1).position = index
      }
      for (let index = map.get(i).node.position + 1; index < list.value.length; index++) {
        const { x, y } = positionMap.get(index)
        console.log(6, index, positionMap.get(index).label, '(' + positionMap.get(index).x + ', ' + positionMap.get(index).y + ')->(' + x + ', ' + y + ') ',
            positionMap.get(index).position + '->' + index)
        positionMap.get(index).x = x
        positionMap.get(index).y = y
        positionMap.get(index).position = index
      }
    }

    map.get(i).node.position = position
    positionMap.clear()
    list.value.forEach((node: any) => {
      positionMap.set(node.position, node)
    })

    list.value.length = 0
    map.clear()
    modelValue.value.length = 0
    for (let index = 0; index < positionMap.size; index++) {
      const node = positionMap.get(index)
      const { x, y } = getLocation(index)
      map.set(node.i, { node, x, y })
      list.value.push(node)
      modelValue.value.push(node.data)
    }
    emit('update:modelValue', modelValue.value)
    emit('moved', modelValue.value)
    currentMovedNode = null
    bus.emit(DRAG_GRID_RESIZE)
  })
}

const getPosition = (x: number, y: number) => {
  return y / height.value * (maxCol.value / width.value) + x / width.value
}
const getLocation = (position: number) => {
  const x = (position % (maxCol.value / width.value)) * width.value
  const y = Math.floor(position / (maxCol.value / width.value)) * height.value
  return { x, y }
}
const forceUpdate = () => {
  map.clear()
  list.value.length = 0
  let index = 0
  for (let y = 0; ; y++) {
    for (let x = 0; x < maxCol.value / width.value; x++) {
      if (list.value.length === modelValue.value.length) return
      const node = getNode(index, modelValue.value[index], x, y)
      map.set(node.i, { node, x: node.x, y: node.y })
      positionMap.set(index, node)
      list.value.push(node)
      index++
    }
  }
}
watch(
    () => modelValue.value,
    () => forceUpdate(),
    {
      immediate: true
    }
)
onMounted(() => {
})
defineExpose({ forceUpdate })
</script>

<style lang="less" scoped>
:deep(.vgl-item:not(.vgl-item--placeholder)) {
  background-color: rgb(255, 255, 255, 0.1);
  // border: 1px solid black;
}

:deep(.vgl-item--resizing) {
  opacity: 90%;
}

:deep(.vgl-item--static) {
  background-color: #cce;
}
</style>