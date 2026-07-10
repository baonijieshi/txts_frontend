<template>
  <el-dialog :model-value="visible" title="提交Bug" width="750px" destroy-on-close @update:model-value="$emit('update:visible', $event)">
    <el-form ref="bugFormRef" :model="bugForm" :rules="bugFormRules" label-width="90px">
      <el-form-item label="Bug标题" prop="title">
        <el-input v-model="bugForm.title" placeholder="请输入Bug标题" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Bug类型" prop="bugType">
            <el-select v-model="bugForm.bugType" placeholder="请选择类型" style="width: 100%">
              <el-option label="代码错误" value="代码错误" />
              <el-option label="界面优化" value="界面优化" />
              <el-option label="设计缺陷" value="设计缺陷" />
              <el-option label="性能问题" value="性能问题" />
              <el-option label="安全相关" value="安全相关" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="严重程度" prop="severity">
            <el-select v-model="bugForm.severity" placeholder="请选择" style="width: 100%">
              <el-option label="致命" value="致命" />
              <el-option label="严重" value="严重" />
              <el-option label="一般" value="一般" />
              <el-option label="轻微" value="轻微" />
              <el-option label="建议" value="建议" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="优先级" prop="priority">
            <el-select v-model="bugForm.priority" placeholder="请选择" style="width: 100%">
              <el-option label="P0 - 最高" value="P0" />
              <el-option label="P1 - 高" value="P1" />
              <el-option label="P2 - 中" value="P2" />
              <el-option label="P3 - 低" value="P3" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="指派给" prop="assignee">
            <UserCascader v-model="bugForm.assignee" :user-list="userOptions" placeholder="请选择" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="关联用例">
            <el-input :model-value="caseRef" disabled />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="重现步骤" prop="stepsToReproduce">
        <el-input v-model="bugForm.stepsToReproduce" type="textarea" :rows="6" placeholder="请详细描述重现步骤" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="bugForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交Bug</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { createBug } from '@/api/bug';
import UserCascader from '@/components/UserCascader.vue';

const props = defineProps({
  visible: Boolean,
  initialForm: { type: Object, default: null },
  runCaseId: { type: Number, default: null },
  userOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'saved']);

const bugFormRef = ref(null);
const submitting = ref(false);

const caseRef = computed(() => (props.runCaseId ? '用例 #'.concat(props.runCaseId) : ''));

const defaultBugForm = () => ({
  title: '',
  bugType: '代码错误',
  severity: '一般',
  priority: 'P1',
  assignee: null,
  stepsToReproduce: '',
  remark: '',
});

const bugForm = ref(defaultBugForm());

const bugFormRules = {
  title: [{ required: true, message: '请输入Bug标题', trigger: 'blur' }],
  bugType: [{ required: true, message: '请选择Bug类型', trigger: 'change' }],
  severity: [{ required: true, message: '请选择严重程度', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  assignee: [{ required: true, message: '请选择指派人', trigger: 'change' }],
  stepsToReproduce: [{ required: true, message: '请输入重现步骤', trigger: 'blur' }],
};

watch(() => props.visible, (val) => {
  if (val) {
    bugForm.value = props.initialForm
      ? { ...defaultBugForm(), ...props.initialForm }
      : defaultBugForm();
  }
});

const handleSubmit = async () => {
  if (!bugFormRef.value) return;
  try {
    await bugFormRef.value.validate();
    submitting.value = true;
    await createBug({
      title: bugForm.value.title,
      bug_type: bugForm.value.bugType,
      severity: bugForm.value.severity,
      priority: bugForm.value.priority,
      assignee: bugForm.value.assignee,
      steps_to_reproduce: bugForm.value.stepsToReproduce,
      remark: bugForm.value.remark,
      case: props.runCaseId || null,
    });
    ElMessage.success('Bug提交成功');
    emit('update:visible', false);
    emit('saved');
  } catch {
    // 提交失败
  } finally {
    submitting.value = false;
  }
};
</script>
