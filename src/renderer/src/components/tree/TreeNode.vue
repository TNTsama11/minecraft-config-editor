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
        @contextmenu.prevent="onContextMenu"
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

    <!-- 右键菜单 -->
    <ContextMenu ref="contextMenuRef" @action="handleContextAction" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, Folder, FolderOpened, Document, Tickets, Files } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ContextMenu from './ContextMenu.vue'
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

const isExpanded = ref(props.depth < 2)
const contextMenuRef = ref<InstanceType<typeof ContextMenu>>()

function toggleExpand(): void {
  isExpanded.value = !isExpanded.value
}

function handleSelect(): void {
  if (!props.node.isDirectory && props.node.file) {
    emit('select', props.node.file)
  }
}

function onContextMenu(event: MouseEvent): void {
  if (!props.node.path) return
  contextMenuRef.value?.show(event)
}

async function handleContextAction(action: 'open' | 'folder'): Promise<void> {
  if (!props.node.path) return

  try {
    if (action === 'open') {
      await window.electronAPI.file.openFile(props.node.path)
    } else {
      await window.electronAPI.file.openInFolder(props.node.path)
    }
  } catch (error) {
    ElMessage.error(`操作失败：${(error as Error).message}`)
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
