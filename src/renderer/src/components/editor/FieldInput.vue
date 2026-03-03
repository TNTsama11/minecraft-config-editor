<template>
  <div class="field-input">
    <!-- 字符串类型 -->
    <template v-if="type === 'string'">
      <template v-if="metadata?.inputType === 'color'">
        <el-input
          v-model="inputValue"
          placeholder="颜色代码"
          @change="handleChange"
          style="width: 120px"
        >
          <template #prefix>
            <span :style="{ color: inputValue }">■</span>
          </template>
        </el-input>
        <el-color-picker v-model="colorValue" @change="handleColorChange" />
      </template>
      <template v-else-if="metadata?.enum">
        <el-select
          v-model="inputValue"
          :placeholder="metadata?.description || '请选择或输入'"
          @change="handleChange"
          filterable
          allow-create
          default-first-option
          clearable
        >
          <el-option
            v-for="option in metadata.enum"
            :key="option"
            :label="option"
            :value="option"
          />
        </el-select>
      </template>
      <template v-else>
        <el-input
          v-model="inputValue"
          :placeholder="metadata?.example || '请输入'"
          @change="handleChange"
        />
      </template>
    </template>

    <!-- 数字类型 -->
    <template v-else-if="type === 'number'">
      <el-input-number
        v-model="numberValue"
        :min="metadata?.min"
        :max="metadata?.max"
        :step="numberStep"
        :precision="numberPrecision"
        @change="handleNumberChange"
      />
      <span v-if="metadata?.unit" class="unit-label">{{ getUnitLabel(metadata.unit) }}</span>
    </template>

    <!-- 布尔类型 -->
    <template v-else-if="type === 'boolean'">
      <el-switch v-model="boolValue" @change="handleBoolChange" />
    </template>

    <!-- 空值类型 -->
    <template v-else-if="type === 'null'">
      <span class="null-value">null</span>
    </template>

    <!-- 默认 -->
    <template v-else>
      <el-input v-model="inputValue" @change="handleChange" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { ConfigValue, FieldType, FieldMetadata, TimeUnit } from '../../../../common/types'

interface Props {
  value: ConfigValue
  type: FieldType
  metadata?: FieldMetadata
}

const props = defineProps<Props>()
const emit = defineEmits<{
  change: [value: ConfigValue]
}>()

// 输入值
const inputValue = ref<string>(String(props.value ?? ''))
const numberValue = ref<number>(Number(props.value) || 0)
const boolValue = ref<boolean>(Boolean(props.value))

// 计算数字步进值（根据值类型自动判断）
const numberStep = computed(() => {
  // 如果范围包含小数，使用 0.1 或 0.01
  const min = props.metadata?.min
  const max = props.metadata?.max
  const val = Number(props.value)

  // 检查是否有小数
  const hasDecimal = (v: number | undefined) => v !== undefined && v % 1 !== 0
  if (hasDecimal(min) || hasDecimal(max) || hasDecimal(val)) {
    // 根据精度确定步进
    const getPrecision = (v: number | undefined) => {
      if (v === undefined) return 0
      const str = v.toString()
      const dotIndex = str.indexOf('.')
      return dotIndex === -1 ? 0 : str.length - dotIndex - 1
    }
    const precision = Math.max(getPrecision(min), getPrecision(max), getPrecision(val))
    if (precision >= 3) return 0.001
    if (precision >= 2) return 0.01
    return 0.1
  }
  return 1
})

// 计算数字精度
const numberPrecision = computed(() => {
  if (numberStep.value < 1) {
    return Math.ceil(-Math.log10(numberStep.value))
  }
  return 0
})

// Minecraft 颜色代码映射表
const MC_COLOR_MAP: Record<string, string> = {
  '0': '#000000', // 黑色
  '1': '#0000AA', // 深蓝色
  '2': '#00AA00', // 深绿色
  '3': '#00AAAA', // 深青色
  '4': '#AA0000', // 深红色
  '5': '#AA00AA', // 深紫色
  '6': '#FFAA00', // 金色
  '7': '#AAAAAA', // 灰色
  '8': '#555555', // 深灰色
  '9': '#5555FF', // 蓝色
  'a': '#55FF55', // 绿色
  'b': '#55FFFF', // 青色
  'c': '#FF5555', // 红色
  'd': '#FF55FF', // 粉色
  'e': '#FFFF55', // 黄色
  'f': '#FFFFFF'  // 白色
}

// 颜色值（用于颜色选择器）
const colorValue = computed({
  get: () => {
    const val = String(props.value)
    // Minecraft 颜色代码转十六进制
    if (val.startsWith('#')) return val
    // 支持 §x 格式的颜色代码
    if (val.startsWith('§')) {
      const code = val.charAt(1).toLowerCase()
      return MC_COLOR_MAP[code] || '#ffffff'
    }
    return '#ffffff'
  },
  set: (val: string) => {
    inputValue.value = val
  }
})

// 监听 props 变化
watch(
  () => props.value,
  (newVal) => {
    inputValue.value = String(newVal ?? '')
    numberValue.value = Number(newVal) || 0
    boolValue.value = Boolean(newVal)
  }
)

// 处理字符串变更
function handleChange(): void {
  emit('change', inputValue.value)
}

// 处理颜色变更
function handleColorChange(val: string): void {
  emit('change', val)
}

// 处理数字变更
function handleNumberChange(val: number | undefined): void {
  emit('change', val ?? 0)
}

// 处理布尔值变更
function handleBoolChange(val: boolean): void {
  emit('change', val)
}

// 获取单位标签
function getUnitLabel(unit: TimeUnit): string {
  const labels: Record<TimeUnit, string> = {
    ticks: 'Ticks',
    seconds: '秒',
    minutes: '分钟',
    milliseconds: '毫秒'
  }
  return labels[unit] || unit
}
</script>

<style scoped>
.field-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit-label {
  font-size: 11px;
  color: #707070;
  white-space: nowrap;
}

.null-value {
  color: #707070;
  font-style: italic;
}
</style>
