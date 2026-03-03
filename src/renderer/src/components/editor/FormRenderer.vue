<template>
  <div class="form-renderer" :class="{ 'search-match': isMatch }">
    <!-- 对象类型 - 折叠面板 -->
    <template v-if="node.type === 'object' && node.children">
      <el-collapse :model-value="searchText ? node.path : undefined">
        <el-collapse-item :name="node.path">
          <template #title>
            <div class="panel-title">
              <span class="key-name" v-html="highlightText(node.key)"></span>
              <span class="field-count">{{ node.children.length }} 个字段</span>
            </div>
          </template>
          <div class="nested-content">
            <FormRenderer
              v-for="child in node.children"
              :key="child.path"
              :node="child"
              :metadata="metadata"
              :search-text="searchText"
              @change="(path, value) => $emit('change', path, value)"
            />
          </div>
        </el-collapse-item>
      </el-collapse>
    </template>

    <!-- 列表类型 -->
    <template v-else-if="node.type === 'list' && node.children">
      <div class="list-field">
        <div class="field-header">
          <span class="key-name" v-html="highlightText(node.key)"></span>
          <span class="type-badge">列表</span>
        </div>
        <div class="list-items">
          <div v-for="(child, index) in node.children" :key="child.path" class="list-item">
            <span class="item-index">{{ index + 1 }}</span>
            <FieldInput
              :value="child.value"
              :type="getListItemType(child)"
              :metadata="fieldMetadata"
              @change="(value) => handleListChange(index, value)"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- 基本类型 -->
    <template v-else>
      <div class="basic-field">
        <div class="field-header">
          <span class="key-name" v-html="highlightText(node.key)"></span>
          <span class="type-badge">{{ node.type }}</span>
        </div>

        <!-- 注释/描述 -->
        <div v-if="fieldMetadata?.description" class="field-description">
          {{ fieldMetadata.description }}
        </div>

        <!-- 元数据信息栏 -->
        <div v-if="hasMetadataInfo" class="field-meta-info">
          <span v-if="fieldMetadata?.defaultValue !== undefined" class="meta-item">
            <el-icon><Document /></el-icon>
            默认值: <code>{{ formatDefaultValue(fieldMetadata.defaultValue) }}</code>
          </span>
          <span v-if="hasRange" class="meta-item">
            <el-icon><Aim /></el-icon>
            范围: <code>{{ fieldMetadata.min }} ~ {{ fieldMetadata.max }}</code>
          </span>
        </div>

        <!-- 输入组件 -->
        <div class="field-input-wrapper">
          <FieldInput
            :value="node.value"
            :type="node.type"
            :metadata="fieldMetadata"
            @change="handleValueChange"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Document, Aim } from '@element-plus/icons-vue'
import FieldInput from './FieldInput.vue'
import type { ConfigNode, ConfigValue, FieldType, FieldMetadata } from '../../../../common/types'

interface Props {
  node: ConfigNode
  metadata?: Record<string, FieldMetadata> | FieldMetadata
  searchText?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  change: [path: string, value: ConfigValue]
}>()

// 检查当前节点是否匹配搜索词
const isMatch = computed(() => {
  if (!props.searchText) return false
  const search = props.searchText.toLowerCase()

  // 检查 key
  if (props.node.key.toLowerCase().includes(search)) return true

  // 检查 value
  if (props.node.value !== null && props.node.value !== undefined) {
    if (String(props.node.value).toLowerCase().includes(search)) return true
  }

  return false
})

// 高亮匹配的文本
function highlightText(text: string): string {
  if (!props.searchText) return text

  const search = props.searchText.toLowerCase()
  const lowerText = text.toLowerCase()
  const index = lowerText.indexOf(search)

  if (index === -1) return text

  const before = text.slice(0, index)
  const match = text.slice(index, index + search.length)
  const after = text.slice(index + search.length)

  return `${before}<mark class="highlight">${match}</mark>${after}`
}

// 获取当前字段的元数据
const fieldMetadata = computed<FieldMetadata | undefined>(() => {
  // 优先使用节点自带的 metadata（从配置文件解析的）
  if (props.node.metadata) {
    return props.node.metadata
  }

  if (!props.metadata) return undefined
  if (typeof props.metadata === 'object' && !('description' in props.metadata)) {
    return (props.metadata as Record<string, FieldMetadata>)[props.node.path]
  }
  return props.metadata as FieldMetadata
})

// 是否有范围限制
const hasRange = computed(() => {
  return fieldMetadata.value?.min !== undefined || fieldMetadata.value?.max !== undefined
})

// 是否有元数据信息
const hasMetadataInfo = computed(() => {
  return fieldMetadata.value?.defaultValue !== undefined || hasRange.value
})

// 格式化默认值显示
function formatDefaultValue(value: ConfigValue): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  return String(value)
}

// 获取列表项类型
function getListItemType(node: ConfigNode): FieldType {
  if (node.type === 'number') return 'number'
  if (node.type === 'boolean') return 'boolean'
  return 'string'
}

// 处理值变更
function handleValueChange(value: ConfigValue): void {
  emit('change', props.node.path, value)
}

// 处理列表项变更
function handleListChange(index: number, value: ConfigValue): void {
  if (props.node.children) {
    const newList = props.node.children.map((child, i) =>
      i === index ? { ...child, value } : child
    )
    emit('change', props.node.path, newList.map((c) => c.value))
  }
}
</script>

<style scoped>
.form-renderer {
  margin-bottom: 14px;
}

.form-renderer.search-match {
  background: rgba(93, 140, 62, 0.15);
  border-left: 3px solid var(--mc-primary);
  padding-left: 8px;
  margin-left: -8px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.key-name {
  font-size: 13px;
  color: #ffffff;
}

.field-count {
  font-size: 11px;
  color: #707070;
}

.nested-content {
  padding-left: 14px;
}

.field-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.type-badge {
  font-size: 9px;
  padding: 1px 4px;
  background: var(--mc-bg-dark);
  color: #707070;
  border: 1px solid var(--mc-border);
}

.field-description {
  font-size: 12px;
  color: #aaddff;
  background: rgba(58, 124, 165, 0.2);
  padding: 8px 12px;
  margin-bottom: 8px;
  border-left: 3px solid #55aaff;
  line-height: 1.5;
}

.field-meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #aaaaaa;
}

.meta-item .el-icon {
  font-size: 12px;
  color: #ffaa00;
}

.meta-item code {
  background: var(--mc-bg-dark);
  padding: 2px 6px;
  border: 1px solid var(--mc-border);
  font-family: 'Minecraft', monospace;
  color: #55ff55;
}

.field-input-wrapper {
  margin-top: 4px;
}

.basic-field {
  padding: 12px 0;
  border-bottom: 2px solid var(--mc-border);
}

.basic-field:last-child {
  border-bottom: none;
}

.list-field {
  padding: 12px 0;
  border-bottom: 2px solid var(--mc-border);
}

.list-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-index {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mc-bg-dark);
  border: 2px solid;
  border-color: #2a2a2a #5a5a5a #5a5a5a #2a2a2a;
  font-size: 11px;
  color: #707070;
  flex-shrink: 0;
}

/* 高亮样式 */
:deep(.highlight) {
  background: rgba(255, 200, 50, 0.5);
  color: #ffff55;
  padding: 0 2px;
  border-radius: 2px;
}
</style>
