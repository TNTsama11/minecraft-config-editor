<template>
  <div class="tree-node">
    <!-- 文件夹节点 -->
    <div
      v-if="node.isDirectory"
      class="node-item folder"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="toggleExpand"
    >
      <el-icon class="toggle-icon" :class="{ expanded: isExpanded }">
        <ArrowRight />
      </el-icon>
      <el-icon class="folder-icon">
        <Folder v-if="!isExpanded" />
        <FolderOpened v-else />
      </el-icon>
      <span class="node-name">{{ node.name }}</span>
      <span class="child-count" v-if="node.children">{{ node.children.length }}</span>
    </div>

    <!-- 文件节点 -->
    <el-tooltip
      v-else
      :content="node.file?.relativePath || node.name"
      placement="right"
      :show-after="500"
    >
      <div
        class="node-item file"
        :class="{ active: selectedPath === node.path }"
        :style="{ paddingLeft: `${depth * 16 + 12}px` }"
        @click="handleSelect"
        @contextmenu.prevent="showContextMenu"
      >
        <span class="file-icon-space"></span>
        <el-icon class="file-icon" :class="node.fileType">
          <component :is="getFileIcon(node.fileType)" />
        </el-icon>
        <span class="node-name">{{ node.name }}</span>
      </div>
    </el-tooltip>

    <!-- 子节点 -->
    <div v-if="node.isDirectory && isExpanded && node.children" class="children">
      <TreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :selected-path="selectedPath"
        :depth="depth + 1"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, Folder, FolderOpened, Document, Tickets, Files } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FileTreeNode, ConfigFileType, ConfigFile } from '../../../../common/types'

interface Props {
  node: FileTreeNode
  selectedPath?: string
  depth: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [file: ConfigFile]
}>()

const isExpanded = ref(true)

function toggleExpand(): void {
  isExpanded.value = !isExpanded.value
}

function handleSelect(): void {
  if (!props.node.isDirectory && props.node.file) {
    emit('select', props.node.file)
  }
}

// 显示右键菜单
function showContextMenu(event: MouseEvent): void {
  if (!props.node.path) return

  // 创建自定义右键菜单
  const menu = document.createElement('div')
  menu.className = 'custom-context-menu'
  menu.innerHTML = `
    <div class="menu-item" data-action="open">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>
      <span>打开文件</span>
    </div>
    <div class="menu-item" data-action="folder">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span>打开文件位置</span>
    </div>
  `

  // 设置样式
  Object.assign(menu.style, {
    position: 'fixed',
    left: `${event.clientX}px`,
    top: `${event.clientY}px`,
    background: '#fff',
    borderRadius: '4px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    padding: '4px 0',
    zIndex: '9999',
    minWidth: '150px'
  })

  // 添加菜单项样式
  const style = document.createElement('style')
  style.textContent = `
    .custom-context-menu .menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      color: #303133;
      transition: background 0.15s;
    }
    .custom-context-menu .menu-item:hover {
      background: #f5f7fa;
    }
    .custom-context-menu .menu-item svg {
      color: #606266;
    }
  `
  document.head.appendChild(style)

  // 添加点击事件
  menu.querySelectorAll('.menu-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const action = (item as HTMLElement).dataset.action
      if (action === 'open') {
        await openFile()
      } else if (action === 'folder') {
        await openInFolder()
      }
      closeMenu()
    })
  })

  // 关闭菜单的函数
  function closeMenu() {
    menu.remove()
    style.remove()
    document.removeEventListener('click', closeMenu)
  }

  // 添加到页面
  document.body.appendChild(menu)

  // 点击其他地方关闭菜单
  setTimeout(() => {
    document.addEventListener('click', closeMenu)
  }, 0)

  // 确保菜单在可视区域内
  const rect = menu.getBoundingClientRect()
  if (rect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - rect.width - 10}px`
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - rect.height - 10}px`
  }
}

// 打开文件
async function openFile(): Promise<void> {
  if (!props.node.path) return

  try {
    const result = await window.electronAPI.file.openFile(props.node.path)
    if (!result.success) {
      ElMessage.error('打开文件失败：' + result.error)
    }
  } catch (error) {
    ElMessage.error('打开文件失败：' + (error as Error).message)
  }
}

// 打开文件位置
async function openInFolder(): Promise<void> {
  if (!props.node.path) return

  try {
    const result = await window.electronAPI.file.openInFolder(props.node.path)
    if (!result.success) {
      ElMessage.error('打开文件位置失败：' + result.error)
    }
  } catch (error) {
    ElMessage.error('打开文件位置失败：' + (error as Error).message)
  }
}

function getFileIcon(type?: ConfigFileType) {
  switch (type) {
    case 'properties':
      return Tickets
    case 'yaml':
    case 'toml':
      return Files
    default:
      return Document
  }
}
</script>

<style scoped>
.tree-node {
  user-select: none;
  position: relative;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 10px;
  cursor: pointer;
  white-space: nowrap;
  border: 2px solid transparent;
}

.node-item:hover {
  background: var(--mc-bg-main);
}

.node-item.active {
  background: rgba(93, 140, 62, 0.2);
  border-color: var(--mc-primary);
}

.toggle-icon {
  font-size: 8px;
  color: #707070;
  transition: transform 0.15s;
  flex-shrink: 0;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.folder-icon {
  font-size: 12px;
  color: #ffaa00;
  flex-shrink: 0;
}

.file-icon-space {
  width: 8px;
  flex-shrink: 0;
}

.file-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.file-icon.properties {
  color: #55ff55;
}

.file-icon.yaml {
  color: #ffaa00;
}

.file-icon.toml {
  color: #55aaff;
}

.file-icon.json {
  color: #aaaaaa;
}

.node-name {
  font-size: 12px;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.child-count {
  font-size: 9px;
  color: #707070;
  background: var(--mc-bg-dark);
  padding: 1px 4px;
  border: 1px solid var(--mc-border);
  flex-shrink: 0;
}

.children {
  /* 子节点容器 */
}
</style>
