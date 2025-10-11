<template>
  <div style="width: 100%;height: 50px;background-color: rgba(31, 180, 255, 0.12);position: relative">
    <div class="top-line" />
    <swiper
      class="swiper"
      loop
      :modules="[Autoplay]"
      :autoplay="{delay: 4000, disableOnInteraction: false}"
      :speed="3500"
    >
      <swiper-slide
        v-for="(newsList, index) in swiperData"
        :key="index"
      >
        <div class="slide-item">
          <div
            v-for="(news, i) in newsList"
            :key="i"
            class="slide-sub-item"
          >
            <span>{{ news }}</span>
          </div>
        </div>
      </swiper-slide>
    </swiper>
    <div class="bottom-line" />
  </div>
</template>

<script setup lang="ts">
import 'swiper/css'
import { Autoplay } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/vue'

const splitLength = 1
const swiperData: Array<string>[] = []
const props = defineProps<{data: Array<string>}>()
const { data } = toRefs(props)

const init = () => {
  for (let i = 0, len = data.value.length; i < len; i+=splitLength) {
    swiperData.push(data.value.slice(i, Math.min(i+splitLength, len)))
  }
}


onBeforeMount(init)

</script>

<style scoped>
.top-line {
  left: 12%;
  width: 80%;
  height: 1px;
  background-color: #136480;
  position: absolute;
  top: 0;
}
.swiper {
  width: 100%;
  height: 100%;
}
.slide-item {
  height: 100%;
  display: flex;
  align-items: center;
  position: relative;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: 'Noto Sans SC', ui-sans-serif;
}
.slide-sub-item {
  flex: 1;
  height: 100%;
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding-right: 10px;
}
.slide-sub-item span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-sizing: border-box;
  padding-left: 3px;
}
.bottom-line {
  height: 3px;
  width: 100%;
  background-size: cover;
  position: absolute;
  bottom: 0;
}
</style>
