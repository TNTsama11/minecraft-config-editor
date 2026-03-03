<template>
  <div class="config-editor">
    <div class="editor-header">
      <h3>{{ file.name }}</h3>
      <span class="file-type-badge" :class="file.type">{{ file.type.toUpperCase() }}</span>
    </div>

    <!-- 搜索框 -->
    <div class="search-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索字段名或值..."
        prefix-icon="Search"
        clearable
        size="small"
      />
      <span v-if="searchText && matchCount > 0" class="match-count">
        {{ matchCount }} 个匹配
      </span>
    </div>

    <div class="editor-content">
      <template v-if="filteredData.length > 0">
        <FormRenderer
          v-for="node in filteredData"
          :key="node.path"
          :node="node"
          :metadata="metadata[node.path]"
          :search-text="searchText"
          @change="handleNodeChange"
        />
      </template>
      <template v-else-if="configData.length > 0 && searchText">
        <div class="empty-tip">
          <el-icon :size="48"><Search /></el-icon>
          <p>未找到匹配的字段</p>
        </div>
      </template>
      <template v-else>
        <div class="empty-tip">
          <el-icon :size="48"><Document /></el-icon>
          <p>文件为空或无法解析</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Document, Search } from '@element-plus/icons-vue'
import FormRenderer from './FormRenderer.vue'
import type { ConfigFile, ConfigNode, ConfigValue, FieldMetadata } from '../../../../common/types'

interface Props {
  file: ConfigFile
  configData: ConfigNode[]
  metadata: Record<string, FieldMetadata>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  change: [data: ConfigNode[]]
}>()

const searchText = ref('')

// 检查节点是否匹配搜索词
function nodeMatchesSearch(node: ConfigNode, search: string): boolean {
  if (!search) return true
  const lowerSearch = search.toLowerCase()

  // 检查 key
  if (node.key.toLowerCase().includes(lowerSearch)) return true

  // 检查 value
  if (node.value !== null && node.value !== undefined) {
    if (String(node.value).toLowerCase().includes(lowerSearch)) return true
  }

  // 检查子节点
  if (node.children) {
    return node.children.some(child => nodeMatchesSearch(child, search))
  }

  return false
}

// 过滤配置数据
const filteredData = computed(() => {
  if (!searchText.value) return props.configData

  const filterNodes = (nodes: ConfigNode[]): ConfigNode[] => {
    return nodes
      .filter(node => nodeMatchesSearch(node, searchText.value))
      .map(node => {
        if (node.children) {
          return {
            ...node,
            children: filterNodes(node.children)
          }
        }
        return node
      })
  }

  return filterNodes(props.configData)
})

// 统计匹配数量
const matchCount = computed(() => {
  if (!searchText.value) return 0

  let count = 0
  const countMatches = (nodes: ConfigNode[]) => {
    for (const node of nodes) {
      const keyMatch = node.key.toLowerCase().includes(searchText.value.toLowerCase())
      const valueMatch = node.value !== null && node.value !== undefined &&
        String(node.value).toLowerCase().includes(searchText.value.toLowerCase())

      if (keyMatch || valueMatch) count++

      if (node.children) {
        countMatches(node.children)
      }
    }
  }

  countMatches(props.configData)
  return count
})

// 处理节点变更
function handleNodeChange(path: string, value: ConfigValue): void {
  const updateNode = (nodes: ConfigNode[]): boolean => {
    for (const node of nodes) {
      if (node.path === path) {
        node.value = value
        node.modified = true
        return true
      }
      if (node.children && updateNode(node.children)) {
        return true
      }
    }
    return false
  }

  const newData = JSON.parse(JSON.stringify(props.configData))
  updateNode(newData)
  emit('change', newData)
}
</script>

<style scoped>
.config-editor {
  background: var(--mc-bg-light);
  border: 3px solid;
  border-color: #5a5a5a #1a1a1a #1a1a1a #5a5a5a;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--mc-bg-lighter);
  border-bottom: 3px solid;
  border-color: #4a4a4a #1a1a1a #1a1a1a #4a4a4a;
}

.editor-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: normal;
  color: #55ff55;
  text-shadow: 2px 2px 0 #1a3a1a;
}

.file-type-badge {
  font-size: 10px;
  padding: 2px 8px;
  font-weight: normal;
  border: 2px solid;
}

.file-type-badge.properties {
  background: rgba(93, 140, 62, 0.3);
  border-color: #5D8C3E;
  color: #7aff7a;
}

.file-type-badge.yaml {
  background: rgba(212, 160, 23, 0.3);
  border-color: #D4A017;
  color: #ffd700;
}

.file-type-badge.toml {
  background: rgba(58, 124, 165, 0.3);
  border-color: #3A7CA5;
  color: #55aaff;
}

.file-type-badge.json {
  background: rgba(160, 160, 160, 0.3);
  border-color: #808080;
  color: #aaaaaa;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--mc-bg-dark);
  border-bottom: 2px solid var(--mc-border);
}

.search-bar .el-input {
  flex: 1;
}

.match-count {
  font-size: 11px;
  color: #55ff55;
  white-space: nowrap;
}

.editor-content {
  flex: 1;
  overflow: auto;
  padding: 14px 16px;
}

.empty-tip {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #707070;
}

.empty-tip p {
  margin-top: 12px;
}
</style>
