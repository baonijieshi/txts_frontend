<template>
  <el-dialog :model-value="visible" title="解决Bug" width="500px" destroy-on-close @update:model-value="handleClose">
    <el-form ref="resolveFormRef" :model="resolveForm" :rules="resolveRules" label-width="90px">
      <el-form-item label="解决类型" prop="resolution">
        <el-radio-group v-model="resolveForm.resolution" class="resolution-radio-group">
          <el-radio label="已修复">已修复</el-radio>
          <el-radio label="无需修复">无需修复</el-radio>
          <el-radio label="重复Bug">重复Bug</el-radio>
          <el-radio label="无法重现">无法重现</el-radio>
          <el-radio label="设计如此">设计如此</el-radio>
          <el-radio label="延期处理">延期处理</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="产生原因" prop="cause">
        <el-input v-model="resolveForm.cause" type="textarea" :rows="4" placeholder="请描述Bug产生的原因" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { resolveBug } from '@/api/bug';

const props = defineProps({
  visible: Boolean,
  bugId: { type: Number, default: null },
});

const emit = defineEmits(['update:visible', 'saved']);

const resolveFormRef = ref(null);
const resolveForm = ref({ resolution: '', cause: '' });
const resolveRules = {
  resolution: [{ required: true, message: '请选择解决类型', trigger: 'change' }],
  cause: [{ required: true, message: '请描述产生原因', trigger: 'blur' }],
};

watch(() => props.visible, (val) => {
  if (val) resolveForm.value = { resolution: '', cause: '' };
});

const handleClose = () => { emit('update:visible', false); };

const handleSubmit = async () => {
  if (!resolveFormRef.value) return;
  try {
    await resolveFormRef.value.validate();
    await resolveBug(props.bugId, resolveForm.value);
    ElMessage.success('Bug已标记为已解决');
    emit('update:visible', false);
    emit('saved');
  } catch {
    // 校验失败或请求失败
  }
};
</script>

<style scoped lang="scss">
.resolution-radio-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 12px;
}
</style>
