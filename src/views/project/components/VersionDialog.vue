<template>
  <el-dialog
    :model-value="visible"
    width="640px"
    destroy-on-close
    class="version-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template #header>
      <span class="vdlg-title">{{ title }}</span>
    </template>

    <el-form ref="formRef" :model="form" :rules="formRules" label-position="top" class="version-form">
      <!-- 基本信息 -->
      <div class="form-section">
        <div class="form-section__heading">基本信息</div>
        <el-form-item label="版本名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入版本名称" size="large" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="关联需求">
              <ModernSelect v-model="form.story" :options="storySelectOptions" placeholder="选择需求（可选）" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联项目">
              <ModernSelect v-model="form.projectIds" :options="projectSelectOptions" placeholder="选择项目（可多选）" multiple clearable />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 团队与状态 -->
      <div class="form-section">
        <div class="form-section__heading">团队与状态</div>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="产品经理">
              <UserCascader v-model="form.manager" :user-list="pmUserList" placeholder="选择" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="开发负责人">
              <UserCascader v-model="form.devLeader" :user-list="devUserList" placeholder="选择" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="测试负责人">
              <UserCascader v-model="form.testLeader" :user-list="testUserList" placeholder="选择" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态">
          <ModernSelect v-model="form.status" :options="versionStatusOptions" placeholder="选择状态" />
        </el-form-item>
      </div>

      <!-- 周期与描述 -->
      <div class="form-section">
        <div class="form-section__heading">周期与描述</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开始日期">
              <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期">
              <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="版本描述">
          <el-input v-model="form.desc" type="textarea" :rows="3" placeholder="输入版本描述…" />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <div class="vdlg-footer">
        <el-button size="large" @click="$emit('update:visible', false)">取消</el-button>
        <el-button size="large" type="primary" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { createVersion, updateVersion } from '@/api/version';
import ModernSelect from '@/components/ModernSelect.vue';
import UserCascader from '@/components/UserCascader.vue';

const props = defineProps({
  visible: Boolean,
  editingId: { type: Number, default: null },
  initialForm: { type: Object, default: null },
  storyOptions: { type: Array, default: () => [] },
  projectOptions: { type: Array, default: () => [] },
  pmUserList: { type: Array, default: () => [] },
  devUserList: { type: Array, default: () => [] },
  testUserList: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'saved']);

const formRef = ref(null);
const title = ref('新建版本');

const defaultForm = () => ({
  name: '',
  story: null,
  projectIds: [],
  manager: null,
  devLeader: null,
  testLeader: null,
  status: '未开始',
  startDate: '',
  endDate: '',
  desc: '',
});

const form = ref(defaultForm());

const formRules = {
  name: [{ required: true, message: '请输入版本名称', trigger: 'blur' }],
};

const storySelectOptions = computed(() =>
  props.storyOptions.map((s: any) => ({ label: s.title, value: s.id }))
);
const projectSelectOptions = computed(() =>
  props.projectOptions.map((p: any) => ({ label: p.name, value: p.id }))
);
const versionStatusOptions = [
  { label: '未开始', value: '未开始' },
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' },
  { label: '已暂停', value: '已暂停' },
];

watch(() => props.visible, (val) => {
  if (val) {
    title.value = props.editingId ? '编辑版本' : '新建版本';
    form.value = props.initialForm ? { ...props.initialForm } : defaultForm();
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    const payload = {
      name: form.value.name,
      story: form.value.story || null,
      project_ids: form.value.projectIds || [],
      manager: form.value.manager || null,
      dev_leader: form.value.devLeader || null,
      test_leader: form.value.testLeader || null,
      status: form.value.status,
      start_date: form.value.startDate || null,
      end_date: form.value.endDate || null,
      description: form.value.desc || '',
    };
    if (props.editingId) {
      await updateVersion(props.editingId, payload);
      ElMessage.success('版本已更新');
    } else {
      await createVersion(payload);
      ElMessage.success('版本已创建');
    }
    emit('update:visible', false);
    emit('saved');
  } catch {
    // validation or request failed
  }
};
</script>

<style scoped lang="scss">
/* ══════════════════════════════════════════════
   版本表单 — 现代无边界风格
   ══════════════════════════════════════════════ */

.version-dialog {
  :deep(.el-dialog) {
    border-radius: 20px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    padding: 24px 28px 0;
    margin-right: 0;
    border-bottom: none;
  }

  :deep(.el-dialog__body) {
    padding: 20px 28px 8px;
  }

  :deep(.el-dialog__footer) {
    padding: 12px 28px 24px;
  }
}

.vdlg-title {
  font-size: 19px;
  font-weight: 650;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

/* ── 表单 ── */
.version-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    padding-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select .el-input__wrapper),
  :deep(.el-date-editor.el-input) {
    border-radius: 10px;
    border-color: var(--border-light);
    box-shadow: none;
    transition: border-color 0.2s, box-shadow 0.2s;

    &:hover { border-color: var(--border-color); }
    &.is-focus { border-color: var(--el-color-primary); box-shadow: 0 0 0 1px var(--el-color-primary-light-7); }
  }

  :deep(.el-select) { width: 100%; }
  :deep(.el-date-editor) { width: 100%; }
}

/* ── 分区 ── */
.form-section {
  margin-bottom: 24px;

  &:last-child { margin-bottom: 0; }

  &__heading {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 16px;
    letter-spacing: -0.2px;
  }
}

/* ── 底部按钮 ── */
.vdlg-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
