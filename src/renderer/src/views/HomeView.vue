<template>
  <div class="home-view">
    <div class="home-content">
      <!-- Logo 区域 -->
      <div class="logo-section">
        <div class="logo-block">
          <div class="logo-inner">
            <span class="logo-icon">⛏</span>
          </div>
        </div>
        <h1 class="title">MC Config Editor</h1>
        <p class="subtitle">Minecraft 配置文件可视化编辑器</p>
      </div>

      <!-- 主按钮 -->
      <div class="action-section">
        <button class="mc-home-button primary" @click="selectDirectory">
          <span class="btn-icon">📁</span>
          <span>选择 Minecraft 目录</span>
        </button>
      </div>

      <!-- 最近打开 -->
      <div class="recent-section" v-if="recentServers.length > 0">
        <h3>最近打开</h3>
        <div class="recent-list">
          <div
            v-for="server in recentServers"
            :key="server.path"
            class="recent-item"
            @click="openRecent(server.path)"
          >
            <span class="recent-icon">📂</span>
            <div class="recent-info">
              <span class="recent-name">{{ server.name }}</span>
              <span class="recent-path">{{ server.path }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 支持的配置类型 -->
      <div class="config-types">
        <div class="config-type-item">
          <span class="config-icon">🖥️</span>
          <div class="config-info">
            <span class="config-title">服务端配置</span>
            <span class="config-desc">server.properties, bukkit.yml, paper.yml...</span>
          </div>
        </div>
        <div class="config-type-item">
          <span class="config-icon">🎮</span>
          <div class="config-info">
            <span class="config-title">客户端配置</span>
            <span class="config-desc">options.txt, servers.dat, realms...</span>
          </div>
        </div>
        <div class="config-type-item">
          <span class="config-icon">📦</span>
          <div class="config-info">
            <span class="config-title">模组/插件配置</span>
            <span class="config-desc">config/*.toml, config/*.json...</span>
          </div>
        </div>
      </div>

      <!-- 功能特性 -->
      <div class="feature-section">
        <div class="feature-item">
          <span class="feature-icon">📄</span>
          <span>多种格式</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✏️</span>
          <span>可视化编辑</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">💾</span>
          <span>自动备份</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📝</span>
          <span>参数说明</span>
        </div>
      </div>

      <!-- 版本信息 -->
      <div class="version-info">
        v1.0.0
      </div>
    </div>

    <!-- 装饰性背景方块 -->
    <div class="bg-blocks">
      <div class="block block-1"></div>
      <div class="block block-2"></div>
      <div class="block block-3"></div>
      <div class="block block-4"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { RecentServer } from '../../common/types'

const router = useRouter()

const recentServers = ref<RecentServer[]>([])

async function selectDirectory(): Promise<void> {
  try {
    const path = await window.electronAPI.file.selectDirectory()
    if (path) {
      router.push({ path: '/editor', query: { dir: path } })
    }
  } catch (error) {
    ElMessage.error('选择目录失败：' + (error as Error).message)
  }
}

function openRecent(path: string): void {
  router.push({ path: '/editor', query: { dir: path } })
}
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mc-bg-main);
  position: relative;
  overflow: hidden;
}

.home-content {
  background: var(--mc-bg-light);
  border: 4px solid;
  border-color: #5a5a5a #1a1a1a #1a1a1a #5a5a5a;
  padding: 36px 44px;
  text-align: center;
  position: relative;
  z-index: 10;
  max-width: 520px;
  width: 90%;
}

.logo-section {
  margin-bottom: 28px;
}

.logo-block {
  width: 72px;
  height: 72px;
  background: #8b8b8b;
  border: 4px solid;
  border-color: #373737 #ffffff #ffffff #373737;
  padding: 6px;
  margin: 0 auto 14px;
  display: inline-block;
}

.logo-inner {
  width: 100%;
  height: 100%;
  background: #6a6a6a;
  border: 3px solid;
  border-color: #555555 #9a9a9a #9a9a9a #555555;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-icon {
  font-size: 32px;
  filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.3));
}

.title {
  font-size: 22px;
  color: #ffff55;
  text-shadow: 3px 3px 0 #3f3f00;
  margin: 0 0 6px 0;
  font-weight: normal;
  letter-spacing: 1px;
}

.subtitle {
  font-size: 12px;
  color: #aaaaaa;
  margin: 0;
}

.action-section {
  margin-bottom: 24px;
}

.mc-home-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  font-size: 14px;
  font-family: 'Minecraft', monospace;
  color: #ffffff;
  text-shadow: 2px 2px 0 #2a2a2a;
  border: 3px solid;
  cursor: pointer;
  transition: none;
}

.mc-home-button.primary {
  background: linear-gradient(180deg, #6a9a4a 0%, #4a7a2a 50%, #3a6a1a 51%, #2a5a0a 100%);
  border-color: #7aab5a #1a4a0a #1a4a0a #7aab5a;
}

.mc-home-button.primary:hover {
  background: linear-gradient(180deg, #7aaa5a 0%, #5a8a3a 50%, #4a7a2a 51%, #3a6a1a 100%);
  border-color: #8abb6a #2a5a1a #2a5a1a #8abb6a;
}

.mc-home-button:active {
  border-color: #1a4a0a #7aab5a #7aab5a #1a4a0a;
}

.btn-icon {
  font-size: 16px;
}

.recent-section {
  margin-bottom: 20px;
  text-align: left;
}

.recent-section h3 {
  font-size: 12px;
  color: #aaaaaa;
  margin: 0 0 8px 0;
  font-weight: normal;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--mc-bg-dark);
  border: 2px solid;
  border-color: #2a2a2a #5a5a5a #5a5a5a #2a2a2a;
  cursor: pointer;
  transition: none;
}

.recent-item:hover {
  background: var(--mc-bg-main);
  border-color: var(--mc-primary) var(--mc-primary-dark) var(--mc-primary-dark) var(--mc-primary);
}

.recent-icon {
  font-size: 16px;
}

.recent-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  text-align: left;
}

.recent-name {
  font-size: 12px;
  color: #ffffff;
}

.recent-path {
  font-size: 10px;
  color: #707070;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 配置类型说明 */
.config-types {
  margin-bottom: 20px;
  text-align: left;
}

.config-type-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--mc-bg-dark);
  border: 2px solid;
  border-color: #2a2a2a #4a4a4a #4a4a4a #2a2a2a;
  margin-bottom: 6px;
}

.config-icon {
  font-size: 20px;
}

.config-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.config-title {
  font-size: 12px;
  color: #55ff55;
}

.config-desc {
  font-size: 10px;
  color: #707070;
}

.feature-section {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #aaaaaa;
}

.feature-icon {
  font-size: 12px;
}

.version-info {
  font-size: 10px;
  color: #505050;
  margin-top: 8px;
}

/* 背景装饰方块 */
.bg-blocks {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}

.block {
  position: absolute;
  background: var(--mc-bg-light);
  opacity: 0.3;
}

.block-1 {
  width: 60px;
  height: 60px;
  top: 10%;
  left: 5%;
}

.block-2 {
  width: 40px;
  height: 40px;
  top: 20%;
  right: 10%;
}

.block-3 {
  width: 50px;
  height: 50px;
  bottom: 15%;
  left: 8%;
}

.block-4 {
  width: 70px;
  height: 70px;
  bottom: 10%;
  right: 5%;
}
</style>
