<template>
  <aside class="resizable-sidebar" :style="{ width: `${width}px` }">
    <slot></slot>
    <div
      class="resize-handle"
      @mousedown="startResize"
      :class="{ resizing: isResizing }"
    ></div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  storageKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  minWidth: 200,
  maxWidth: 500,
  defaultWidth: 280,
  storageKey: 'sidebar-width'
})

const width = ref(props.defaultWidth)
const isResizing = ref(false)
let startX = 0
let startWidth = 0

// 从 localStorage 恢复宽度
onMounted(() => {
  if (props.storageKey) {
    const saved = localStorage.getItem(props.storageKey)
    if (saved) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed) && parsed >= props.minWidth && parsed <= props.maxWidth) {
        width.value = parsed
      }
    }
  }
})

function startResize(e: MouseEvent): void {
  e.preventDefault()
  isResizing.value = true
  startX = e.clientX
  startWidth = width.value

  document.addEventListener('mousemove', doResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function doResize(e: MouseEvent): void {
  const delta = e.clientX - startX
  let newWidth = startWidth + delta

  // 限制最小和最大宽度
  newWidth = Math.max(props.minWidth, Math.min(props.maxWidth, newWidth))
  width.value = newWidth
}

function stopResize(): void {
  isResizing.value = false
  document.removeEventListener('mousemove', doResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  // 保存宽度到 localStorage
  if (props.storageKey) {
    localStorage.setItem(props.storageKey, width.value.toString())
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', doResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.resizable-sidebar {
  position: relative;
  flex-shrink: 0;
  background: var(--mc-bg-light);
  border-right: 3px solid;
  border-color: #1a1a1a;
  overflow: hidden;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  z-index: 10;
}

.resize-handle:hover,
.resize-handle.resizing {
  background: var(--mc-primary);
}
</style>
