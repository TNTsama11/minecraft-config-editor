<template>
  <div class="file-tree-container">
    <!-- 搜索框 -->
    <div class="tree-search">
      <el-input
        v-model="searchText"
        placeholder="搜索配置文件..."
        prefix-icon="Search"
        clearable
        size="small"
      />
    </div>

    <!-- 分类视图 -->
    <div class="tree-content" v-if="!searchText">
      <!-- 服务器核心配置 -->
      <div class="category-section" v-if="categorized.serverConfigs.length > 0">
        <div class="category-header" @click="toggleCategory('server')">
          <el-icon class="toggle-icon" :class="{ expanded: expandedCategories.server }">
            <ArrowRight />
          </el-icon>
          <span class="category-icon server">🖥️</span>
          <span class="category-title">服务端配置</span>
          <span class="category-count">{{ categorized.serverConfigs.length }}</span>
        </div>
        <div class="category-content" v-show="expandedCategories.server">
          <TreeNode
            v-for="node in serverTree"
            :key="node.path"
            :node="node"
            :selected-path="selectedPath"
            :depth="0"
            @select="$emit('select', $event)"
          />
        </div>
      </div>

      <!-- 客户端配置 -->
      <div class="category-section" v-if="categorized.clientConfigs.length > 0">
        <div class="category-header" @click="toggleCategory('client')">
          <el-icon class="toggle-icon" :class="{ expanded: expandedCategories.client }">
            <ArrowRight />
          </el-icon>
          <span class="category-icon client">🎮</span>
          <span class="category-title">客户端配置</span>
          <span class="category-count">{{ categorized.clientConfigs.length }}</span>
        </div>
        <div class="category-content" v-show="expandedCategories.client">
          <TreeNode
            v-for="node in clientTree"
            :key="node.path"
            :node="node"
            :selected-path="selectedPath"
            :depth="0"
            @select="$emit('select', $event)"
          />
        </div>
      </div>

      <!-- 模组配置 -->
      <div class="category-section" v-if="categorized.modConfigs.length > 0">
        <div class="category-header" @click="toggleCategory('mod')">
          <el-icon class="toggle-icon" :class="{ expanded: expandedCategories.mod }">
            <ArrowRight />
          </el-icon>
          <span class="category-icon mod">📦</span>
          <span class="category-title">模组/插件配置</span>
          <span class="category-count">{{ categorized.modConfigs.length }}</span>
        </div>
        <div class="category-content" v-show="expandedCategories.mod">
          <TreeNode
            v-for="node in modTree"
            :key="node.path"
            :node="node"
            :selected-path="selectedPath"
            :depth="0"
            @select="$emit('select', $event)"
          />
        </div>
      </div>

      <!-- 其他配置 -->
      <div class="category-section" v-if="categorized.otherConfigs.length > 0">
        <div class="category-header" @click="toggleCategory('other')">
          <el-icon class="toggle-icon" :class="{ expanded: expandedCategories.other }">
            <ArrowRight />
          </el-icon>
          <span class="category-icon other">📂</span>
          <span class="category-title">其他配置</span>
          <span class="category-count">{{ categorized.otherConfigs.length }}</span>
        </div>
        <div class="category-content" v-show="expandedCategories.other">
          <TreeNode
            v-for="node in otherTree"
            :key="node.path"
            :node="node"
            :selected-path="selectedPath"
            :depth="0"
            @select="$emit('select', $event)"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-tip" v-if="totalFiles === 0">未找到配置文件</div>
    </div>

    <!-- 搜索结果视图 -->
    <div class="tree-content" v-else>
      <div class="search-results">
        <template v-if="filteredFiles.length > 0">
          <div
            v-for="file in filteredFiles"
            :key="file.path"
            class="search-result-item"
            :class="{ active: selectedPath === file.path }"
            @click="$emit('select', file)"
          >
            <span class="file-icon" :class="file.type">📄</span>
            <div class="file-info">
              <span class="file-name" v-html="highlightText(file.name)"></span>
              <span class="file-path" v-html="highlightText(file.relativePath)"></span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="empty-tip">未找到匹配的配置文件</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import TreeNode from './TreeNode.vue'
import type { ConfigFile, ConfigFileType, FileTreeNode } from '../../../../common/types'

interface Props {
  files: ConfigFile[]
  selectedPath?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [file: ConfigFile]
}>()

const searchText = ref('')

// 分类展开状态
const expandedCategories = ref({
  server: true,
  client: true,
  mod: true,
  other: true
})

// 服务器核心配置文件名
const SERVER_CONFIG_NAMES = new Set([
  'server.properties',
  'bukkit.yml',
  'spigot.yml',
  'paper.yml',
  'purpur.yml',
  'pufferfish.yml',
  'tuinity.yml',
  'airplane.yml',
  'commands.yml',
  'permissions.yml',
  'help.yml',
  'eula.txt',
  'whitelist.json',
  'banned-players.json',
  'banned-ips.json',
  'ops.json'
])

// 客户端配置文件名
const CLIENT_CONFIG_NAMES = new Set([
  'options.txt',
  'optionsof.txt',
  'servers.dat',
  'realms_persistence.json',
  'launcher_profiles.json'
])

// 分类后的文件
const categorized = computed(() => {
  const serverConfigs: ConfigFile[] = []
  const clientConfigs: ConfigFile[] = []
  const modConfigs: ConfigFile[] = []
  const otherConfigs: ConfigFile[] = []

  for (const file of props.files) {
    const lowerPath = (file.relativePath || file.name).toLowerCase().replace(/\\/g, '/')
    const fileName = file.name.toLowerCase()

    // 判断是否为服务端核心配置
    const isServerConfig = SERVER_CONFIG_NAMES.has(fileName)

    // 判断是否为客户端配置
    const isClientConfig = CLIENT_CONFIG_NAMES.has(fileName)

    // 判断是否为模组/插件配置（在 config 目录下）
    const isModConfig =
      lowerPath.startsWith('config/') ||
      lowerPath.includes('/config/') ||
      lowerPath.includes('plugins/')

    if (isServerConfig) {
      serverConfigs.push(file)
    } else if (isClientConfig) {
      clientConfigs.push(file)
    } else if (isModConfig) {
      modConfigs.push(file)
    } else {
      otherConfigs.push(file)
    }
  }

  return { serverConfigs, clientConfigs, modConfigs, otherConfigs }
})

// 总文件数
const totalFiles = computed(() => props.files.length)

// 构建各分类的树形结构
const serverTree = computed(() => buildTree(categorized.value.serverConfigs))
const clientTree = computed(() => buildTree(categorized.value.clientConfigs))
const modTree = computed(() => buildTree(categorized.value.modConfigs))
const otherTree = computed(() => buildTree(categorized.value.otherConfigs))

// 搜索过滤
const filteredFiles = computed(() => {
  if (!searchText.value) return []
  const search = searchText.value.toLowerCase()
  return props.files.filter(
    (file) =>
      file.name.toLowerCase().includes(search) ||
      file.relativePath?.toLowerCase().includes(search)
  )
})

// 切换分类展开
function toggleCategory(category: keyof typeof expandedCategories.value): void {
  expandedCategories.value[category] = !expandedCategories.value[category]
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function highlightText(text: string | undefined): string {
  if (!text) return ''
  if (!searchText.value) return escapeHtml(text)

  const search = searchText.value.toLowerCase()
  const lowerText = text.toLowerCase()
  const index = lowerText.indexOf(search)

  if (index === -1) return escapeHtml(text)

  const before = escapeHtml(text.slice(0, index))
  const match = escapeHtml(text.slice(index, index + search.length))
  const after = escapeHtml(text.slice(index + search.length))

  return `${before}<mark class="highlight">${match}</mark>${after}`
}

// 构建树形结构
function buildTree(files: ConfigFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  for (const file of files) {
    const parts = (file.relativePath || file.name).replace(/\\/g, '/').split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1

      if (isFile) {
        current.push({
          name: part,
          path: file.path,
          isDirectory: false,
          file: file,
          fileType: file.type
        })
      } else {
        let dirNode = current.find((n) => n.name === part && n.isDirectory)

        if (!dirNode) {
          dirNode = {
            name: part,
            path: '',
            isDirectory: true,
            children: []
          }
          current.push(dirNode)
        }

        current = dirNode.children!
      }
    }
  }

  return sortNodes(root)
}

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

  for (const node of nodes) {
    if (node.children) {
      node.children = sortNodes(node.children)
    }
  }

  return nodes
}
</script>

<style scoped>
.file-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--mc-bg-light);
}

.tree-search {
  padding: 10px 12px;
  background: var(--mc-bg-dark);
  border-bottom: 2px solid var(--mc-border);
}

.tree-content {
  flex: 1;
  overflow: auto;
}

.category-section {
  border-bottom: 2px solid var(--mc-border);
}

.category-section:last-child {
  border-bottom: none;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  background: var(--mc-bg-lighter);
  user-select: none;
  border: 2px solid transparent;
}

.category-header:hover {
  background: var(--mc-bg-main);
}

.toggle-icon {
  font-size: 10px;
  color: #707070;
  transition: transform 0.15s;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.category-icon {
  font-size: 14px;
}

.category-icon.server {
  /* 服务端 */
}

.category-icon.client {
  /* 客户端 */
}

.category-icon.mod {
  /* 模组 */
}

.category-icon.other {
  /* 其他 */
}

.category-title {
  flex: 1;
  font-size: 12px;
  color: #ffffff;
  text-shadow: 1px 1px 0 #1a1a1a;
}

.category-count {
  font-size: 10px;
  color: #707070;
  background: var(--mc-bg-dark);
  padding: 2px 6px;
  border: 1px solid var(--mc-border);
}

.category-content {
  padding: 4px 0;
}

/* 搜索结果样式 */
.search-results {
  padding: 8px 0;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  border: 2px solid transparent;
}

.search-result-item:hover {
  background: var(--mc-bg-main);
}

.search-result-item.active {
  background: rgba(93, 140, 62, 0.2);
  border-color: var(--mc-primary);
}

.file-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.file-name {
  font-size: 12px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-path {
  font-size: 10px;
  color: #707070;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-tip {
  padding: 20px 14px;
  text-align: center;
  color: #707070;
  font-size: 12px;
}

/* 高亮样式 */
:deep(.highlight) {
  background: rgba(255, 200, 50, 0.5);
  color: #ffff55;
  padding: 0 2px;
  border-radius: 2px;
}
</style>
