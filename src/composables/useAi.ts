import { ref, computed, watch } from 'vue';

export interface AiConfig {
  provider: 'openai' | 'deepseek' | 'custom';
  model: string;
  apiKey: string;
  baseUrl: string;
}

export interface AiOptions {
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

const STORAGE_KEY = 'tx_ai_config';

const PROVIDER_DEFAULTS: Record<string, { model: string; baseUrl: string }> = {
  openai: { model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1' },
  deepseek: { model: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com' },
  custom: { model: '', baseUrl: '' },
};

function loadConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { provider: 'deepseek', model: 'deepseek-v4-flash', apiKey: '', baseUrl: 'https://api.deepseek.com' };
}

function saveConfig(config: AiConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** AI 客户端组合式函数 */
export function useAi() {
  const config = ref<AiConfig>(loadConfig());

  const isAvailable = computed(() => !!config.value.apiKey);
  const isProcessing = ref(false);

  watch(config, saveConfig, { deep: true });

  function updateConfig(partial: Partial<AiConfig>) {
    Object.assign(config.value, partial);
    // 切换 provider 时自动填充默认值
    if (partial.provider && partial.provider !== 'custom') {
      const defaults = PROVIDER_DEFAULTS[partial.provider];
      config.value.model = defaults.model;
      config.value.baseUrl = defaults.baseUrl;
    }
  }

  /** 构建请求体并发送 */
  async function complete(prompt: string, options: AiOptions = {}): Promise<string> {
    if (!isAvailable.value) throw new Error('请先在设置中配置 AI API Key');
    isProcessing.value = true;
    try {
      const { baseUrl, model, apiKey } = config.value;
      const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.signal ? 0 : 15000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens ?? 1024,
          temperature: options.temperature ?? 0.7,
          stream: false,
        }),
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`API 请求失败 (${res.status}): ${errBody}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content === undefined || content === null) {
        // API 返回了 200 但响应格式异常，可能是模型名错误或 API 不兼容
        const snippet = JSON.stringify(data).slice(0, 200);
        throw new Error(`API 响应格式异常，未找到 content 字段：${snippet}`);
      }
      return content;
    } finally {
      isProcessing.value = false;
    }
  }

  return {
    config,
    isAvailable,
    isProcessing,
    updateConfig,
    complete,
  };
}
