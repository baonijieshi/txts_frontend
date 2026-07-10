<template>
  <el-dialog :model-value="visible" :title="title" width="540px" destroy-on-close @update:model-value="$emit('update:visible', $event)">
    <div class="form-section">
      <div class="section-title">目标内容</div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0">
        <el-form-item prop="title">
          <el-input
            v-model="form.title"
            placeholder="目标标题"
            size="large"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="描述（可选），补充说明目标的背景或成功标准"
          />
        </el-form-item>
      </el-form>
    </div>

    <div class="form-section">
      <div class="section-title">负责人与权重</div>
      <el-form-item label-width="0" v-if="alignOptions.length">
        <el-select v-model="form.parent" placeholder="对齐到（可选）" clearable filterable style="width:100%">
          <el-option v-for="a in alignOptions" :key="a.id" :label="a.title + ' — ' + a.owner_name" :value="a.id" />
        </el-select>
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="14">
          <el-form-item label-width="0">
            <UserCascader v-model="form.owner" :user-list="userList" placeholder="选择负责人" />
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item label-width="0">
            <el-input-number
              v-model="form.weight"
              :min="0.1" :max="10" :step="0.1"
              :precision="1"
              placeholder="权重"
              style="width: 100%"
            />
            <template #prepend>权重</template>
          </el-form-item>
        </el-col>
      </el-row>
      <div class="field-hint">
        <el-icon><InfoFilled /></el-icon>
        权重用于计算整体进度贡献，默认 1.0 表示与其他目标同等重要
      </div>
    </div>

    <div class="form-section">
      <div class="section-title">@ 提及成员</div>
      <el-select v-model="form.mentions" multiple filterable placeholder="搜索成员..." style="width:100%">
        <el-option-group v-for="group in mentionOptions" :key="group.label" :label="group.label">
          <el-option v-for="opt in group.options" :key="opt.value" :label="opt.label" :value="opt.value">
            <div class="mention-option">
              <el-avatar :size="18" :src="opt.avatar || ''">{{ opt.label?.charAt(0) }}</el-avatar>
              <span>{{ opt.label }}</span>
            </div>
          </el-option>
        </el-option-group>
      </el-select>
      <div class="field-hint">被 @ 的成员可关注该目标的进展</div>
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        {{ props.editing ? '保存修改' : '创建目标' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, computed } from 'vue';
import { InfoFilled } from '@element-plus/icons-vue';
import UserCascader from '@/components/UserCascader.vue';
import request from '@/utils/request';

const props = defineProps({
  visible: Boolean,
  editing: { type: Object, default: null },
  userList: { type: Array, default: () => [] },
  periodId: { type: Number, default: null },
});
const emit = defineEmits(['update:visible', 'saved']);

const title = computed(() => props.editing ? '编辑目标' : '新建目标');
const loading = ref(false);
const formRef = ref(null);
const alignOptions = ref([]);

const fetchAlignmentOptions = async () => {
  if (!props.periodId) return;
  try {
    const p = { periodId: props.periodId };
    if (props.editing?.id) p.excludeId = props.editing.id;
    const r = await request({ url: '/okr/objective/alignment-options', method: 'get', params: p });
    alignOptions.value = r.data || [];
  } catch { alignOptions.value = []; }
};

const mentionOptions = computed(() => {
  const deptMap = {};
  (props.userList || []).forEach((u) => {
    const dept = u.dept || '未分配部门';
    if (!deptMap[dept]) deptMap[dept] = [];
    deptMap[dept].push({ value: u.id, label: u.label, avatar: u.avatar || '' });
  });
  return Object.keys(deptMap).sort().map((dept) => ({ label: dept, options: deptMap[dept] }));
});

const defaultForm = () => ({
  title: '', description: '', owner: null, weight: 1.0, parent: null, mentions: [],
});

const form = ref(defaultForm());
const rules = { title: [{ required: true, message: '请输入目标标题', trigger: 'blur' }] };

watch(() => props.visible, (val) => {
  if (val) {
    form.value = props.editing
      ? { title: props.editing.title, description: props.editing.description || '', owner: props.editing.owner, weight: props.editing.weight || 1.0, parent: props.editing.parent || null, mentions: props.editing.mentions || [] }
      : defaultForm();
    fetchAlignmentOptions();
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;
  try { await formRef.value.validate(); } catch { return; }
  loading.value = true;
  try {
    emit('saved', { ...form.value });
    emit('update:visible', false);
  } finally { loading.value = false; }
};
</script>

<style scoped lang="scss">
.form-section {
  margin-bottom: 18px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-regular);
  margin-bottom: 10px;
}

.field-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.mention-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
</style>
