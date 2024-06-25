<template>
  <Icon v-for="icon in icons" :key="icon" :icon="icon" class="icons" @click="emitIconName(icon)" />
</template>

<script lang="ts" setup>
const props = defineProps<{ icons: Array<string> }>()
const {icons} = toRefs(props)
const emit = defineEmits(['getIconName'])
const emitIconName = (icon: string) => emit('getIconName', icon)
</script>

<style scoped>
.icons {
  width: 40px;
  height: 40px;
  font-size: 20px;
  justify-content: center;
}

.icons:hover {
  cursor: pointer;
  background: #1890ff;
  color: #fff;
  border-radius: 5px;
}
</style>
