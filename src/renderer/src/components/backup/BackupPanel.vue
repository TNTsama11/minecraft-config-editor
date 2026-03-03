<template>
  <el-drawer
    v-model="visible"
    title="备份管理"
    direction="rtl"
    size="400px"
    @close="$emit('close')"
  >
    <div class="backup-panel">
      <div class="panel-header">
        <el-button type="primary" @click="createBackup" :loading="creating">
          <el-icon><Plus /></el-icon>
          创建备份
        </el-button>
      </div>

      <div class="backup-list" v-loading="loading">
        <template v-if="backups.length > 0">
          <div v-for="backup in backups" :key="backup.id" class="backup-item">
            <div class="backup-info">
              <div class="backup-time">{{ formatDate(backup.createdAt) }}</div>
              <div class="backup-size">{{ formatSize(backup.size) }}</div>
            </div>
            <div class="backup-actions">
              <el-button size="small" @click="restoreBackup(backup.id)" :loading="restoring === backup.id">
                恢复
              </el-button>
              <el-popconfirm title="确定要删除此备份吗？" @confirm="deleteBackup(backup.id)">
                <template #reference>
                  <el-button size="small" type="danger" text>删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="empty-tip">
            <el-icon :size="48"><Clock /></el-icon>
            <p>暂无备份记录</p>
          </div>
        </template>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Clock } from '@element-plus/icons-vue'
import type { Backup } from '../../../../common/types'

interface Props {
  filePath: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  restore: []
}>()

const visible = ref(true)
const loading = ref(false)
const creating = ref(false)
const restoring = ref<string | null>(null)
const backups = ref<Backup[]>([])

// 加载备份列表
async function loadBackups(): Promise<void> {
  if (!props.filePath) return

  loading.value = true
  try {
    const list = await window.electronAPI.backup.list(props.filePath)
    backups.value = list
  } catch (error) {
    ElMessage.error('加载备份列表失败：' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 创建备份
async function createBackup(): Promise<void> {
  if (!props.filePath) return

  creating.value = true
  try {
    const backup = await window.electronAPI.backup.create(props.filePath)
    if (backup) {
      backups.value.unshift(backup)
      ElMessage.success('备份创建成功')
    }
  } catch (error) {
    ElMessage.error('创建备份失败：' + (error as Error).message)
  } finally {
    creating.value = false
  }
}

// 恢复备份
async function restoreBackup(backupId: string): Promise<void> {
  restoring.value = backupId
  try {
    await window.electronAPI.backup.restore(backupId)
    ElMessage.success('备份恢复成功')
    emit('restore')
  } catch (error) {
    ElMessage.error('恢复备份失败：' + (error as Error).message)
  } finally {
    restoring.value = null
  }
}

// 删除备份
async function deleteBackup(backupId: string): Promise<void> {
  try {
    await window.electronAPI.backup.delete(backupId)
    backups.value = backups.value.filter((b) => b.id !== backupId)
    ElMessage.success('备份删除成功')
  } catch (error) {
    ElMessage.error('删除备份失败：' + (error as Error).message)
  }
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 监听文件路径变化
watch(() => props.filePath, loadBackups, { immediate: true })

onMounted(loadBackups)
</script>

<style scoped>
.backup-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  margin-bottom: 14px;
}

.backup-list {
  flex: 1;
  overflow: auto;
}

.backup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--mc-bg-dark);
  border: 2px solid;
  border-color: #2a2a2a #5a5a5a #5a5a5a #2a2a2a;
  margin-bottom: 8px;
}

.backup-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.backup-time {
  font-size: 12px;
  color: #ffffff;
}

.backup-size {
  font-size: 10px;
  color: #707070;
}

.backup-actions {
  display: flex;
  gap: 6px;
}

.empty-tip {
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #707070;
}

.empty-tip p {
  margin-top: 10px;
}
</style>
