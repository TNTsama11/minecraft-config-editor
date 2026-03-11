<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
      @click.stop
    >
      <div class="menu-item" @click="handleAction('open')">
        <span class="menu-icon">📄</span>
        <span>打开文件</span>
      </div>
      <div class="menu-item" @click="handleAction('folder')">
        <span class="menu-icon">📂</span>
        <span>打开文件位置</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const visible = ref(false)
const position = ref({ x: 0, y: 0 })

const emit = defineEmits<{
  action: [action: 'open' | 'folder']
}>()

function show(event: MouseEvent): void {
  position.value = { x: event.clientX, y: event.clientY }
  visible.value = true

  requestAnimationFrame(() => {
    const el = document.querySelector('.context-menu') as HTMLElement
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      position.value.x = window.innerWidth - rect.width - 8
    }
    if (rect.bottom > window.innerHeight) {
      position.value.y = window.innerHeight - rect.height - 8
    }
  })
}

function hide(): void {
  visible.value = false
}

function handleAction(action: 'open' | 'folder'): void {
  emit('action', action)
  hide()
}

function onClickOutside(): void {
  if (visible.value) hide()
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('contextmenu', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('contextmenu', onClickOutside)
})

defineExpose({ show, hide })
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 160px;
  background: var(--mc-bg-lighter, #4a4a4a);
  border: 3px solid;
  border-color: #6a6a6a #2a2a2a #2a2a2a #6a6a6a;
  padding: 4px 0;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Minecraft', monospace;
  color: #ffffff;
  text-shadow: 1px 1px 0 #2a2a2a;
}

.menu-item:hover {
  background: rgba(93, 140, 62, 0.4);
}

.menu-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}
</style>
