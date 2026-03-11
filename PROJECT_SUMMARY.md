# MC Config Editor - 项目摘要

> 自动生成于 2026-03-11，供 AI 辅助检索使用

## 项目概览

Minecraft 服务端配置文件可视化编辑工具，基于 Electron + Vue 3 构建。

## 技术栈

- Electron 29.x + electron-vite 2.x
- Vue 3.4 + Composition API + TypeScript 5.3
- Pinia 2.1 + Vue Router 4.3
- Element Plus 2.5
- js-yaml / @iarna/toml

## 核心模块

### 主进程 (src/main/)

| 文件 | 行数 | 职责 |
|------|------|------|
| index.ts | 171 | 主入口，窗口管理，IPC 路由（16 个通道） |
| services/FileService.ts | 325 | 文件系统操作：目录选择、配置扫描、分类、树构建、读写 |
| services/ConfigService.ts | 713 | 配置解析与序列化：Properties/YAML/TOML/JSON 四格式 |
| services/BackupService.ts | 231 | 备份管理：创建/列出/恢复/删除，存储在 userData |
| services/MetadataService.ts | 324 | 元数据管理：内置 server.properties 30+ 字段中文说明 |

### 预加载 (src/preload/)

| 文件 | 行数 | 职责 |
|------|------|------|
| index.ts | 75 | IPC 桥梁，contextBridge 暴露 electronAPI |

### 公共层 (src/common/)

| 文件 | 行数 | 职责 |
|------|------|------|
| types.ts | 261 | 全局 TypeScript 类型定义 |
| errors.ts | 289 | 结构化错误体系（AppError 及子类） |

### 渲染进程 (src/renderer/src/)

| 文件 | 行数 | 职责 |
|------|------|------|
| views/HomeView.vue | 401 | 首页：目录选择、品牌展示 |
| views/EditorView.vue | 398 | 编辑器页面：文件树 + 配置编辑 + 工具栏 |
| components/editor/ConfigEditor.vue | 253 | 编辑器容器：搜索、表单渲染 |
| components/editor/FormRenderer.vue | 331 | 递归表单渲染（对象/数组/基本类型） |
| components/editor/FieldInput.vue | 226 | 字段输入控件（文本/数字/布尔/颜色/枚举） |
| components/tree/FileTree.vue | 484 | 文件树分类与搜索 |
| components/tree/TreeNode.vue | 312 | 树节点（递归，右键菜单） |
| components/layout/ResizableSidebar.vue | 113 | 可拖拽侧边栏 |
| components/backup/BackupPanel.vue | 214 | 备份管理面板 |
| stores/fileStore.ts | 47 | 文件状态（未充分使用） |
| stores/configStore.ts | 67 | 配置状态（未被使用） |
| stores/backupStore.ts | 53 | 备份状态（未被使用） |
| composables/useError.ts | 147 | 错误处理（未被集成） |

### 样式

| 文件 | 行数 | 职责 |
|------|------|------|
| assets/styles/main.css | 103 | 基础样式 |
| assets/styles/minecraft-theme.css | 433 | Minecraft 深色主题 |

## 支持的配置格式

Properties (.properties), YAML (.yml/.yaml), TOML (.toml), JSON (.json)

## IPC 接口

file:selectDirectory, file:scanConfigs, file:categorize, file:buildTree,
file:read, file:write, file:openFile, file:openInFolder,
config:parse, config:serialize,
backup:create, backup:list, backup:restore, backup:delete,
metadata:get, metadata:save
