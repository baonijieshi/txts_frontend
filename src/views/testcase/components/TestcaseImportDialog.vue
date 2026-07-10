<template>
  <el-dialog :model-value="visible" title="导入 XMind 用例" width="520px" destroy-on-close @update:model-value="$emit('update:visible', $event)">
    <div class="import-content">
      <p class="import-tip">请上传按模版格式编写的 .xmind 文件，系统将自动解析并批量创建测试用例。</p>
      <p class="import-tip">XMind 结构：根节点 → 版本名称节点（需与版本管理中的名称一致）→ 模块节点（格式：【ID】|| 模块名称，ID 为模块管理中的模块 ID）→ 用例节点。</p>
      <p class="import-tip">
        <el-link type="primary" :href="templateUrl" target="_blank">
          <el-icon><Download /></el-icon>下载 XMind 用例模版
        </el-link>
      </p>
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :limit="1"
        accept=".xmind"
        :on-change="onFileChange"
        :on-exceed="onFileExceed"
        drag
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">将 .xmind 文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xmind 格式文件</div>
        </template>
      </el-upload>
    </div>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="loading" :disabled="!importFile" @click="handleImport">开始导入</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { importXmind, getTemplateUrl } from '@/api/testcase';

defineProps({ visible: Boolean });
const emit = defineEmits(['update:visible', 'imported']);

const uploadRef = ref(null);
const importFile = ref(null);
const loading = ref(false);
const templateUrl = getTemplateUrl();

const onFileChange = (file) => { importFile.value = file.raw; };
const onFileExceed = () => { ElMessage.warning('只能上传一个文件，请先移除已选文件'); };

const handleImport = async () => {
  if (!importFile.value) return;
  loading.value = true;
  try {
    const res = await importXmind(importFile.value);
    ElMessage.success(res.message || '导入成功');
    emit('update:visible', false);
    emit('imported');
    importFile.value = null;
    if (uploadRef.value) uploadRef.value.clearFiles();
  } catch {
    // 导入失败
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.import-content {
  .import-tip {
    margin-bottom: 12px;
    color: var(--text-regular);
    font-size: 14px;
  }
}
</style>
