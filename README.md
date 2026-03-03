# MC Config Editor

<p align="center">
  <strong>Minecraft 服务端配置文件可视化编辑工具</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-29.x-47848F?style=flat-square&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/Vue-3.4-4FC08D?style=flat-square&logo=vue.js" alt="Vue">
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## 简介

MC Config Editor 是一款专为 Minecraft 服务器管理员设计的配置文件编辑工具。通过直观的图形界面，轻松编辑和管理各类配置文件，无需手动查找和修改文本。

### ✨ 特性

- 🎨 **Minecraft 风格界面** - 原汁原味的像素风 UI 设计
- 📁 **文件树浏览** - 直观的目录结构展示
- ✏️ **可视化编辑** - 表单化的配置项编辑
- 🔍 **快速搜索** - 即时搜索配置项名称和值
- 💾 **自动备份** - 保存前自动创建备份
- 📋 **多格式支持** - Properties / YAML / TOML / JSON

### 📦 支持的配置文件

| 格式 | 扩展名 | 示例文件 |
|------|--------|----------|
| Properties | `.properties` | `server.properties` |
| YAML | `.yml`, `.yaml` | `bukkit.yml`, `spigot.yml`, `paper.yml` |
| TOML | `.toml` | Mod 配置文件 |
| JSON | `.json` | `whitelist.json`, `banned-players.json` |

## 📸 截图

> 截图待添加

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x
- npm >= 9.x

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/TNTsama11/minecraft-config-editor.git
cd minecraft-config-editor

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建生产版本
npm run build

# 打包 Windows 安装程序
npm run build:win
```

## 📖 使用说明

1. **选择目录** - 启动后点击"选择目录"，选择你的 Minecraft 服务端或客户端目录
2. **浏览文件** - 左侧文件树显示所有识别到的配置文件
3. **编辑配置** - 点击文件即可在右侧编辑器中修改配置项
4. **保存更改** - 修改完成后点击"保存"，系统会自动创建备份

### 内置元数据

工具内置了 `server.properties` 的完整中文参数说明，悬停在字段上即可查看详细解释。

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | [Electron](https://www.electronjs.org/) | 29.x |
| 前端 | [Vue 3](https://vuejs.org/) | 3.4.x |
| 构建 | [electron-vite](https://electron-vite.org/) | 2.x |
| 状态管理 | [Pinia](https://pinia.vuejs.org/) | 2.1.x |
| UI 组件 | [Element Plus](https://element-plus.org/) | 2.5.x |
| 语言 | [TypeScript](https://www.typescriptlang.org/) | 5.3.x |

## 📁 项目结构

```
minecraft-config-editor/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 主进程入口
│   │   └── services/         # 服务层
│   │       ├── FileService.ts
│   │       ├── ConfigService.ts
│   │       ├── BackupService.ts
│   │       └── MetadataService.ts
│   ├── preload/              # 预加载脚本
│   ├── common/               # 公共类型与错误处理
│   └── renderer/             # 渲染进程 (Vue 3)
│       └── src/
│           ├── components/   # UI 组件
│           ├── views/        # 页面视图
│           ├── stores/       # Pinia 状态管理
│           └── composables/  # 组合式函数
├── resources/                # 应用资源
└── package.json
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

---

<p align="center">
  Made with ❤️ for Minecraft server administrators
</p>
