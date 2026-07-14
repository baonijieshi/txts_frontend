<template>
  <div class="ai-page">
    <div class="ai-card">
      <!-- 服务商选择 -->
      <div class="config-section">
        <h3 class="section-title">服务商</h3>
        <p class="section-desc">选择 AI 服务提供商</p>
        <div class="provider-group">
          <button
            v-for="p in providers"
            :key="p.key"
            class="provider-btn"
            :class="{ active: cfg.provider === p.key }"
            @click="ai.updateConfig({ provider: p.key })"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- 模型配置 -->
      <div class="config-section">
        <h3 class="section-title">模型配置</h3>
        <p class="section-desc">设置模型名称，切换服务商时会自动填充默认模型</p>
        <el-input
          v-model="cfg.model"
          placeholder="模型名称"
          style="max-width:360px"
          @update:model-value="ai.updateConfig({ model: $event })"
        />
        <div v-if="cfg.provider === 'custom'" class="config-sub-row">
          <span class="sub-label">Base URL</span>
          <el-input
            v-model="cfg.baseUrl"
            placeholder="https://api.example.com/v1"
            style="max-width:360px"
            @update:model-value="ai.updateConfig({ baseUrl: $event })"
          />
        </div>
      </div>

      <!-- API Key -->
      <div class="config-section">
        <h3 class="section-title">API Key</h3>
        <p class="section-desc">你的 API Key 仅存储在当前浏览器的本地存储中，不会上传到服务器</p>
        <el-input
          v-model="cfg.apiKey"
          type="password"
          show-password
          placeholder="sk-..."
          style="max-width:480px"
          @update:model-value="ai.updateConfig({ apiKey: $event })"
        />
      </div>

      <!-- 测试连接 -->
      <div class="config-section">
        <h3 class="section-title">连接测试</h3>
        <p class="section-desc">验证 API Key 和模型配置是否可用</p>
        <div class="test-area">
          <el-button
            :loading="testing"
            :disabled="!ai.isAvailable.value"
            @click="testConnection"
          >
            测试连接
          </el-button>
          <span v-if="ai.isAvailable.value" class="status-ok">
            <el-icon :size="14"><CircleCheckFilled /></el-icon>API Key 已配置
          </span>
          <span v-else class="status-muted">API Key 未配置</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { CircleCheckFilled } from '@element-plus/icons-vue';
import { useAi } from '@/composables/useAi';

const ai = useAi();
const cfg = ai.config;
const testing = ref(false);

const providers = [
  { key: 'deepseek', label: 'DeepSeek' },
  { key: 'openai', label: 'OpenAI' },
  { key: 'custom', label: '自定义' },
];

async function testConnection() {
  testing.value = true;
  try {
    const res = await ai.complete('请只回复"ok"', { maxTokens: 50 });
    const trimmed = res.trim().toLowerCase();
    if (trimmed === 'ok' || trimmed === '"ok"' || trimmed === '“ok”') {
      ElMessage.success('AI 连接测试通过');
    } else {
      ElMessage.warning('连接成功，响应内容：' + res.slice(0, 100));
    }
  } catch (e: any) {
    const msg = e.message || '未知错误';
    if (msg.includes('400') || msg.includes('401') || msg.includes('403')) {
      const detail = msg.includes(':') ? msg.split(':').slice(1).join(':').trim() : msg;
      ElMessage.error('请求失败：' + (detail || '请检查 API Key 或模型名称是否正确'));
    } else {
      ElMessage.error('连接失败：' + msg);
    }
  } finally {
    testing.value = false;
  }
}
</script>

<style scoped lang="scss">
.ai-page {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
}

.ai-card {
  background: var(--bg-card);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  padding: 24px 28px;
  max-width: 720px;
}

.config-section {
  margin-bottom: 28px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .section-desc {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 14px;
  }
}

.config-sub-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.sub-label {
  font-size: 13px;
  color: var(--text-regular);
  flex-shrink: 0;
  min-width: 60px;
}

/* ── 服务商按钮组 ── */
.provider-group {
  display: flex;
  gap: 8px;
}

.provider-btn {
  padding: 7px 18px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-regular);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &.active {
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
    color: #fff;
  }
}

/* ── 测试区 ── */
.test-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-ok {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-color-success);
  font-weight: 500;
}

.status-muted {
  font-size: 13px;
  color: var(--text-placeholder);
}
</style>
