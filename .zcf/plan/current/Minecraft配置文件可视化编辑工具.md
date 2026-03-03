# Minecraft 配置文件可视化编辑工具 - 执行计划

> 创建时间: 2026-02-26
> 技术栈: Electron + Vue 3 + TypeScript + Vite
> 状态: 待批准

---

## 一、项目概述

### 1.1 项目目标

构建一个完全离线的 Minecraft 服务端配置文件可视化编辑工具，支持：
- 服务端原生配置文件（server.properties、bukkit.yml 等）
- 模组配置文件（.yml、.toml、.json）
- 自动备份与版本回滚
- 用户自定义配置说明

### 1.2 核心功能模块

```
┌─────────────────────────────────────────────────────────────┐
│                        应用架构                               │
├─────────────────────────────────────────────────────────────┤
│  主进程 (Main Process)                                       │
│  ├── FileService      - 文件系统操作                          │
│  ├── BackupService    - 备份管理                              │
│  ├── ConfigService    - 配置解析与序列化                       │
│  └── MetadataService  - 元数据管理                            │
├─────────────────────────────────────────────────────────────┤
│  渲染进程 (Renderer Process - Vue 3)                          │
│  ├── FileTree         - 文件树组件                            │
│  ├── ConfigEditor     - 配置编辑器                            │
│  ├── FormRenderer     - 动态表单渲染                           │
│  ├── BackupPanel      - 备份管理面板                          │
│  └── MetadataEditor   - 元数据编辑器                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、项目结构

```
O:\pet\
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 主进程入口
│   ├── preload.ts               # 预加载脚本
│   └── services/                # 主进程服务
│       ├── FileService.ts       # 文件系统服务
│       ├── BackupService.ts     # 备份服务
│       ├── ConfigService.ts     # 配置解析服务
│       └── MetadataService.ts   # 元数据服务
├── src/                         # Vue 渲染进程
│   ├── App.vue                  # 根组件
│   ├── main.ts                  # 渲染进程入口
│   ├── components/              # UI 组件
│   │   ├── layout/              # 布局组件
│   │   │   ├── AppLayout.vue    # 主布局
│   │   │   ├── Sidebar.vue      # 侧边栏
│   │   │   └── Header.vue       # 顶部栏
│   │   ├── editor/              # 编辑器组件
│   │   │   ├── ConfigEditor.vue # 配置编辑器主体
│   │   │   ├── FormRenderer.vue # 动态表单渲染
│   │   │   ├── FieldInput.vue   # 通用字段输入
│   │   │   └── NestedPanel.vue  # 嵌套结构面板
│   │   ├── tree/                # 文件树组件
│   │   │   ├── FileTree.vue     # 文件树主体
│   │   │   └── TreeNode.vue     # 树节点
│   │   ├── backup/              # 备份组件
│   │   │   ├── BackupList.vue   # 备份列表
│   │   │   └── BackupItem.vue   # 备份项
│   │   └── common/              # 通用组件
│   │       ├── ColorPicker.vue  # 颜色选择器
│   │       └── TickConverter.vue# Tick转换器
│   ├── views/                   # 页面视图
│   │   ├── HomeView.vue         # 首页（选择目录）
│   │   └── EditorView.vue       # 编辑器页面
│   ├── stores/                  # Pinia 状态管理
│   │   ├── fileStore.ts         # 文件状态
│   │   ├── configStore.ts       # 配置状态
│   │   └── backupStore.ts       # 备份状态
│   ├── composables/             # 组合式函数
│   │   ├── useConfig.ts         # 配置操作
│   │   └── useBackup.ts         # 备份操作
│   ├── types/                   # TypeScript 类型
│   │   ├── config.ts            # 配置类型
│   │   ├── file.ts              # 文件类型
│   │   └── metadata.ts          # 元数据类型
│   ├── utils/                   # 工具函数
│   │   ├── validators.ts        # 验证器
│   │   └── formatters.ts        # 格式化工具
│   └── assets/                  # 静态资源
│       └── metadata/            # 内置元数据
│           └── server-properties.json  # server.properties 说明
├── resources/                   # Electron 资源
│   └── icon.ico                 # 应用图标
├── electron.vite.config.ts      # electron-vite 配置
├── package.json                 # 项目配置
├── tsconfig.json                # TypeScript 配置
└── CLAUDE.md                    # AI 上下文
```

---

## 三、执行步骤

### 阶段 1：项目初始化 (P1)

#### 1.1 初始化项目结构
- [ ] 使用 electron-vite 创建项目骨架
- [ ] 配置 TypeScript（strict 模式）
- [ ] 配置 ESLint + Prettier
- [ ] 安装核心依赖

**预期结果**：可运行的 Electron 空白应用

**关键文件**：
- `package.json` - 依赖配置
- `electron.vite.config.ts` - 构建配置
- `tsconfig.json` - TS 配置

**依赖清单**：
```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.5.0",
    "js-yaml": "^4.1.0",
    "@iarna/toml": "^2.2.0",
    "properties-reader": "^2.3.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-vite": "^2.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "unplugin-auto-import": "^0.17.0",
    "unplugin-vue-components": "^0.26.0"
  }
}
```

---

### 阶段 2：主进程服务开发 (P2)

#### 2.1 FileService - 文件系统服务
- [ ] `selectDirectory()` - 打开目录选择对话框
- [ ] `scanConfigFiles(dir)` - 扫描配置文件
- [ ] `readFile(path)` - 读取文件内容
- [ ] `writeFile(path, content)` - 写入文件
- [ ] `watchFile(path, callback)` - 监听文件变化

#### 2.2 ConfigService - 配置解析服务
- [ ] `parseProperties(content)` - 解析 .properties
- [ ] `parseYaml(content)` - 解析 .yml
- [ ] `parseToml(content)` - 解析 .toml
- [ ] `parseJson(content)` - 解析 .json
- [ ] `serializeProperties(data)` - 序列化 .properties
- [ ] `serializeYaml(data)` - 序列化 .yml
- [ ] `serializeToml(data)` - 序列化 .toml
- [ ] `serializeJson(data)` - 序列化 .json

#### 2.3 BackupService - 备份服务
- [ ] `createBackup(filePath)` - 创建备份
- [ ] `listBackups(filePath)` - 获取备份列表
- [ ] `restoreBackup(backupId)` - 恢复备份
- [ ] `deleteBackup(backupId)` - 删除备份
- [ ] `cleanupOldBackups()` - 清理旧备份（保留最近 20 个）

#### 2.4 MetadataService - 元数据服务
- [ ] `getMetadata(filePath)` - 获取配置元数据
- [ ] `saveUserMetadata(filePath, metadata)` - 保存用户自定义元数据
- [ ] `loadBuiltinMetadata()` - 加载内置元数据

**预期结果**：主进程 IPC 接口完整可用

---

### 阶段 3：渲染进程基础开发 (P3)

#### 3.1 项目布局
- [ ] `AppLayout.vue` - 三栏布局（侧边栏 | 文件树 | 编辑区）
- [ ] `Sidebar.vue` - 左侧导航栏
- [ ] `Header.vue` - 顶部工具栏

#### 3.2 状态管理
- [ ] `fileStore.ts` - 文件树状态、当前选中文件
- [ ] `configStore.ts` - 配置数据、修改状态
- [ ] `backupStore.ts` - 备份列表、恢复操作

#### 3.3 IPC 通信层
- [ ] `preload.ts` - 暴露安全 API 到渲染进程
- [ ] 类型安全的 IPC 调用封装

**预期结果**：基础布局完成，状态管理可用

---

### 阶段 4：核心功能开发 (P4)

#### 4.1 首页 - 目录选择
- [ ] `HomeView.vue` - 目录选择页面
- [ ] 显示最近打开的服务端目录
- [ ] 目录路径验证

#### 4.2 文件树组件
- [ ] `FileTree.vue` - 文件树主体（虚拟滚动）
- [ ] `TreeNode.vue` - 可展开/折叠的节点
- [ ] 支持搜索过滤
- [ ] 文件类型图标区分

#### 4.3 配置编辑器
- [ ] `ConfigEditor.vue` - 编辑器主体
- [ ] `FormRenderer.vue` - 根据数据类型动态渲染表单
- [ ] `FieldInput.vue` - 统一字段输入组件
  - 字符串 → 文本框
  - 数字 → 数字输入（支持范围限制）
  - 布尔 → 开关
  - 列表 → 可编辑列表
  - 枚举 → 下拉选择
- [ ] `NestedPanel.vue` - 嵌套对象折叠面板

**预期结果**：基本的配置编辑功能可用

---

### 阶段 5：增强功能开发 (P5)

#### 5.1 参数提示系统
- [ ] 内置 server.properties 元数据（中文说明）
- [ ] 悬浮提示显示参数说明
- [ ] 显示取值范围和默认值

#### 5.2 智能输入组件
- [ ] `ColorPicker.vue` - Minecraft 颜色代码选择器
- [ ] 材料ID 下拉选择（可选）
- [ ] `TickConverter.vue` - 秒/Tick 双向转换

#### 5.3 数据校验
- [ ] `validators.ts` - 校验规则
  - 端口号范围 (1-65535)
  - IP 地址格式
  - 数字范围
  - 必填字段
- [ ] 保存前校验提示

**预期结果**：编辑体验大幅提升

---

### 阶段 6：备份功能开发 (P6)

#### 6.1 自动备份
- [ ] 保存时自动创建备份
- [ ] 备份文件命名：`原文件名.backup.YYYYMMDD_HHmmss`

#### 6.2 备份管理面板
- [ ] `BackupList.vue` - 当前文件的备份列表
- [ ] `BackupItem.vue` - 单个备份项（时间、大小）
- [ ] 支持预览、恢复、删除

**预期结果**：完整的备份与恢复功能

---

### 阶段 7：元数据自定义 (P7)

#### 7.1 元数据编辑器
- [ ] `MetadataEditor.vue` - 为任意配置项添加说明
- [ ] 支持导入/导出元数据配置

#### 7.2 元数据存储
- [ ] 用户自定义元数据存储在 `%APPDATA%/mc-config-editor/metadata/`
- [ ] 按文件路径关联元数据

**预期结果**：用户可为任意模组配置添加说明

---

### 阶段 8：完善与打包 (P8)

#### 8.1 用户体验优化
- [ ] 未保存提示
- [ ] 快捷键支持 (Ctrl+S 保存)
- [ ] 深色模式（跟随系统）

#### 8.2 打包配置
- [ ] electron-builder 配置
- [ ] Windows 安装包 (.exe)
- [ ] 应用图标

#### 8.3 测试与修复
- [ ] 手动测试各格式解析
- [ ] 边界情况处理
- [ ] 错误提示优化

**预期结果**：可发布的 Windows 应用

---

## 四、数据结构定义

### 4.1 配置文件节点

```typescript
interface ConfigNode {
  key: string;
  value: ConfigValue;
  type: 'string' | 'number' | 'boolean' | 'list' | 'object' | 'null';
  metadata?: FieldMetadata;
  path: string;  // 完整路径，如 "server.port"
}

interface FieldMetadata {
  description?: string;      // 字段说明
  defaultValue?: any;        // 默认值
  min?: number;              // 最小值（数字类型）
  max?: number;              // 最大值（数字类型）
  enum?: string[];           // 枚举值列表
  unit?: 'ticks' | 'seconds' | 'minutes' | 'milliseconds';
  inputType?: 'text' | 'color' | 'material' | 'ip' | 'port';
}

type ConfigValue = string | number | boolean | null | ConfigValue[] | { [key: string]: ConfigValue };
```

### 4.2 文件信息

```typescript
interface ConfigFile {
  path: string;
  name: string;
  type: 'properties' | 'yaml' | 'toml' | 'json';
  size: number;
  lastModified: Date;
  hasUnsavedChanges: boolean;
}
```

### 4.3 备份信息

```typescript
interface Backup {
  id: string;
  originalPath: string;
  backupPath: string;
  createdAt: Date;
  size: number;
}
```

---

## 五、IPC 接口定义

```typescript
// 文件操作
ipcRenderer.invoke('file:selectDirectory'): Promise<string | null>
ipcRenderer.invoke('file:scanConfigs', dir: string): Promise<ConfigFile[]>
ipcRenderer.invoke('file:read', path: string): Promise<string>
ipcRenderer.invoke('file:write', path: string, content: string): Promise<void>

// 配置解析
ipcRenderer.invoke('config:parse', path: string, content: string): Promise<ConfigNode[]>
ipcRenderer.invoke('config:serialize', type: string, data: ConfigNode[]): Promise<string>

// 备份管理
ipcRenderer.invoke('backup:create', filePath: string): Promise<Backup>
ipcRenderer.invoke('backup:list', filePath: string): Promise<Backup[]>
ipcRenderer.invoke('backup:restore', backupId: string): Promise<void>
ipcRenderer.invoke('backup:delete', backupId: string): Promise<void>

// 元数据
ipcRenderer.invoke('metadata:get', filePath: string): Promise<Record<string, FieldMetadata>>
ipcRenderer.invoke('metadata:save', filePath: string, metadata: Record<string, FieldMetadata>): Promise<void>
```

---

## 六、里程碑与预估

| 阶段 | 内容 | 预估工作量 |
|------|------|-----------|
| P1 | 项目初始化 | 0.5 天 |
| P2 | 主进程服务 | 1 天 |
| P3 | 渲染进程基础 | 0.5 天 |
| P4 | 核心功能 | 2 天 |
| P5 | 增强功能 | 1 天 |
| P6 | 备份功能 | 0.5 天 |
| P7 | 元数据自定义 | 0.5 天 |
| P8 | 完善打包 | 1 天 |
| **总计** | | **7 天** |

---

## 七、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| YAML 复杂格式解析问题 | 中 | 高 | 使用 js-yaml，处理异常情况 |
| 大文件性能问题 | 低 | 中 | 虚拟滚动、懒加载 |
| 打包体积过大 | 中 | 低 | 按需引入 Element Plus |

---

**请确认此执行计划是否可以开始实施？**
