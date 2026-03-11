<template>
  <div class="editor-view">
    <div class="editor-layout">
      <!-- 左侧边栏 -->
      <ResizableSidebar :min-width="220" :max-width="450" storage-key="mc-config-sidebar">
        <div class="sidebar">
          <div class="sidebar-header">
            <span class="folder-icon">📁</span>
            <span class="folder-name" :title="serverPath">{{ fileStore.serverName }}</span>
          </div>
          <div class="sidebar-content">
            <FileTree
              :files="fileStore.configFiles"
              :selected-path="fileStore.selectedFile?.path"
              @select="handleFileSelect"
            />
          </div>
        </div>
      </ResizableSidebar>

      <!-- 主内容区 -->
      <main class="main-content">
        <!-- 顶部工具栏 -->
        <header class="toolbar">
          <div class="toolbar-left">
            <button class="mc-toolbar-btn" @click="goHome">
              <span>◀</span> 返回
            </button>
            <template v-if="fileStore.selectedFile">
              <span class="toolbar-divider"></span>
              <span class="file-type-tag" :class="fileStore.selectedFile.type">
                {{ fileStore.selectedFile.type.toUpperCase() }}
              </span>
              <el-tooltip :content="fileStore.selectedFile.path" placement="bottom" :show-after="300">
                <span class="file-path">{{ fileStore.selectedFile.relativePath || fileStore.selectedFile.name }}</span>
              </el-tooltip>
            </template>
          </div>
          <div class="toolbar-right">
            <button
              v-if="fileStore.selectedFile"
              class="mc-toolbar-btn"
              :class="{ disabled: !configStore.canUndo }"
              :disabled="!configStore.canUndo"
              title="撤销 (Ctrl+Z)"
              @click="configStore.undo()"
            >
              <span>↩</span>
            </button>
            <button
              v-if="fileStore.selectedFile"
              class="mc-toolbar-btn"
              :class="{ disabled: !configStore.canRedo }"
              :disabled="!configStore.canRedo"
              title="重做 (Ctrl+Shift+Z)"
              @click="configStore.redo()"
            >
              <span>↪</span>
            </button>
            <button
              v-if="fileStore.selectedFile"
              class="mc-toolbar-btn primary"
              :class="{ disabled: !configStore.hasChanges }"
              :disabled="!configStore.hasChanges"
              @click="saveConfig"
            >
              <span>💾</span> 保存
            </button>
            <button v-if="fileStore.selectedFile" class="mc-toolbar-btn" @click="showBackupPanel = true">
              <span>🕐</span> 备份
            </button>
          </div>
        </header>

        <!-- 编辑区域 -->
        <div class="editor-area">
          <template v-if="fileStore.selectedFile">
            <ConfigEditor
              :file="fileStore.selectedFile"
              :config-data="configStore.configData"
              :metadata="configStore.metadata"
              @change="handleConfigChange"
            />
          </template>
          <template v-else>
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <p>请从左侧选择一个配置文件进行编辑</p>
            </div>
          </template>
        </div>
      </main>
    </div>

    <!-- 备份面板 -->
    <BackupPanel
      v-if="showBackupPanel"
      :file-path="fileStore.selectedFile?.path || ''"
      @close="showBackupPanel = false"
      @restore="handleRestore"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ResizableSidebar from '@/components/layout/ResizableSidebar.vue'
import FileTree from '@/components/tree/FileTree.vue'
import ConfigEditor from '@/components/editor/ConfigEditor.vue'
import BackupPanel from '@/components/backup/BackupPanel.vue'
import { useFileStore } from '@/stores/fileStore'
import { useConfigStore } from '@/stores/configStore'
import type { ConfigFile, ConfigValue } from '../../common/types'

const route = useRoute()
const router = useRouter()
const fileStore = useFileStore()
const configStore = useConfigStore()

const serverPath = ref('')
const showBackupPanel = ref(false)

onMounted(async () => {
  const dir = route.query.dir as string
  if (dir) {
    serverPath.value = dir
    fileStore.setServerPath(dir)
    await loadConfigFiles()
  } else {
    router.push('/')
  }
  window.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard)
})

function handleKeyboard(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (configStore.hasChanges) saveConfig()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    if (configStore.canUndo) configStore.undo()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
    e.preventDefault()
    if (configStore.canRedo) configStore.redo()
  }
}

async function loadConfigFiles(): Promise<void> {
  try {
    const files = await window.electronAPI.file.scanConfigs(serverPath.value)
    fileStore.setConfigFiles(files)
    if (files.length === 0) {
      ElMessage.warning('未找到任何配置文件')
    }
  } catch (error) {
    ElMessage.error('扫描配置文件失败：' + (error as Error).message)
  }
}

async function handleFileSelect(file: ConfigFile): Promise<void> {
  if (configStore.hasChanges) {
    try {
      await ElMessageBox.confirm('当前有未保存的更改，是否放弃？', '提示', {
        confirmButtonText: '放弃',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }
  }

  fileStore.setSelectedFile(file)
  await loadFileContent(file.path)
  await loadMetadata(file.path)
}

async function loadFileContent(filePath: string): Promise<void> {
  try {
    const content = await window.electronAPI.file.read(filePath)
    const data = await window.electronAPI.config.parse(filePath, content)
    configStore.setConfigData(data)
  } catch (error) {
    ElMessage.error('加载文件失败：' + (error as Error).message)
  }
}

async function loadMetadata(filePath: string): Promise<void> {
  try {
    const metadata = await window.electronAPI.metadata.get(filePath)
    configStore.setMetadata(metadata)
  } catch {
    configStore.setMetadata({})
  }
}

function handleConfigChange(path: string, value: ConfigValue): void {
  configStore.updateConfigNode(path, value)
}

async function saveConfig(): Promise<void> {
  if (!fileStore.selectedFile) return

  try {
    // 保存前自动备份，但不阻止保存
    try {
      await window.electronAPI.backup.create(fileStore.selectedFile.path)
    } catch {
      console.warn('自动备份失败，继续保存')
    }

    const content = await window.electronAPI.config.serialize(
      fileStore.selectedFile.type,
      configStore.configData
    )
    await window.electronAPI.file.write(fileStore.selectedFile.path, content)
    configStore.markSaved()
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败：' + (error as Error).message)
  }
}

async function handleRestore(): Promise<void> {
  if (!fileStore.selectedFile) return
  await loadFileContent(fileStore.selectedFile.path)
  showBackupPanel.value = false
  ElMessage.success('已恢复备份')
}

function goHome(): void {
  if (configStore.hasChanges) {
    ElMessageBox.confirm('当前有未保存的更改，是否放弃？', '提示', {
      confirmButtonText: '放弃',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        configStore.clear()
        router.push('/')
      })
      .catch(() => {})
  } else {
    configStore.clear()
    router.push('/')
  }
}
</script>

<style scoped>
.editor-view {
  height: 100vh;
  overflow: hidden;
  background: var(--mc-bg-main);
}

.editor-layout {
  display: flex;
  height: 100%;
}

.sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--mc-bg-light);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--mc-bg-lighter);
  border-bottom: 3px solid;
  border-color: #5a5a5a #1a1a1a #1a1a1a #5a5a5a;
}

.folder-icon {
  font-size: 16px;
}

.folder-name {
  font-size: 13px;
  color: #55ff55;
  text-shadow: 2px 2px 0 #1a3a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--mc-bg-main);
  min-width: 0;
}

.toolbar {
  height: 48px;
  background: var(--mc-bg-light);
  border-bottom: 3px solid;
  border-color: #5a5a5a #1a1a1a #1a1a1a #5a5a5a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mc-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-family: 'Minecraft', monospace;
  color: #ffffff;
  text-shadow: 1px 1px 0 #2a2a2a;
  background: linear-gradient(180deg, #6a6a6a 0%, #4a4a4a 50%, #3a3a3a 51%, #2a2a2a 100%);
  border: 2px solid;
  border-color: #8a8a8a #2a2a2a #2a2a2a #8a8a8a;
  cursor: pointer;
  transition: none;
}

.mc-toolbar-btn:hover {
  background: linear-gradient(180deg, #7a7a7a 0%, #5a5a5a 50%, #4a4a4a 51%, #3a3a3a 100%);
}

.mc-toolbar-btn.primary {
  background: linear-gradient(180deg, #6a9a4a 0%, #4a7a2a 50%, #3a6a1a 51%, #2a5a0a 100%);
  border-color: #7aab5a #1a4a0a #1a4a0a #7aab5a;
}

.mc-toolbar-btn.primary:hover {
  background: linear-gradient(180deg, #7aaa5a 0%, #5a8a3a 50%, #4a7a2a 51%, #3a6a1a 100%);
}

.mc-toolbar-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-divider {
  width: 2px;
  height: 20px;
  background: var(--mc-border-light);
}

.file-type-tag {
  padding: 2px 8px;
  font-size: 11px;
  font-family: 'Minecraft', monospace;
  border: 2px solid;
}

.file-type-tag.properties {
  background: rgba(93, 140, 62, 0.3);
  border-color: #5D8C3E;
  color: #7aff7a;
}

.file-type-tag.yaml {
  background: rgba(212, 160, 23, 0.3);
  border-color: #D4A017;
  color: #ffd700;
}

.file-type-tag.toml {
  background: rgba(58, 124, 165, 0.3);
  border-color: #3A7CA5;
  color: #55aaff;
}

.file-type-tag.json {
  background: rgba(160, 160, 160, 0.3);
  border-color: #808080;
  color: #aaaaaa;
}

.file-path {
  font-size: 13px;
  color: #aaaaaa;
  max-width: 350px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-area {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #707070;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
}
</style>
