<template>
  <el-dialog
    :model-value="visible"
    width="1400px"
    :show-close="true"
    destroy-on-close
    class="version-detail-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <!-- ═══ Hero 头部 ═══ -->
    <template #header>
      <div class="vdd-hero">
        <!-- 标题行 -->
        <div class="vdd-hero__top">
          <div class="vdd-hero__title-row">
            <span class="vdd-hero__back" @click="$emit('update:visible', false)">
              <el-icon><ArrowLeft /></el-icon>
            </span>
            <span class="vdd-hero__name">{{ version?.name }}</span>
            <el-tag v-if="version" :type="statusType(version.status)" size="default" effect="dark" round>
              {{ version.status }}
            </el-tag>
            <el-tag
              v-if="version?.test_status && version.test_status !== '未提测'"
              :type="testStatusTagType"
              size="default"
              effect="plain"
              round
            >{{ version.test_status }}</el-tag>
            <el-tag
              v-if="version?.acceptance_status && version.acceptance_status !== '待验收'"
              :type="acceptanceStatusTagType"
              size="default"
              effect="plain"
              round
            >{{ version.acceptance_status }}</el-tag>
          </div>
          <div class="vdd-hero__actions">
            <el-button size="default" @click="handleEditVersion">编辑</el-button>
            <el-button v-if="canSubmitTest" size="default" type="warning" plain @click="handleSubmitTestFromHero">提测</el-button>
            <el-button v-if="canPassTest" size="default" type="success" plain @click="handlePassTestFromHero">通过</el-button>
            <el-button v-if="canRejectTest" size="default" type="danger" plain @click="handleRejectTestFromHero">驳回</el-button>
            <el-button v-if="canSubmitAcceptance" size="default" type="primary" plain @click="handleSubmitAcceptanceFromHero">提交验收</el-button>
            <el-button v-if="canPassAcceptance" size="default" type="success" plain @click="handlePassAcceptanceFromHero">验收通过</el-button>
            <el-button v-if="canRejectAcceptance" size="default" type="danger" plain @click="handleRejectAcceptanceFromHero">验收驳回</el-button>
          </div>
        </div>

        <!-- 指标行：大号进度环 + 双进度条 + 团队 + 周期 -->
        <div class="vdd-hero__metrics">
          <!-- 大号进度环 -->
          <div class="hero-progress-ring">
            <svg viewBox="0 0 100 100" class="ring-svg">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-hover)" stroke-width="8" />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="url(#progressGradient)"
                stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="2 * Math.PI * 42"
                :stroke-dashoffset="2 * Math.PI * 42 * (1 - overallProgress / 100)"
                transform="rotate(-90 50 50)"
                class="ring-fill"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" :stop-color="progressGradientStart" />
                  <stop offset="100%" :stop-color="progressGradientEnd" />
                </linearGradient>
              </defs>
            </svg>
            <div class="ring-text">
              <span class="ring-text__value">{{ overallProgress }}%</span>
              <span class="ring-text__label">整体进度</span>
            </div>
          </div>

          <!-- 双进度条 -->
          <div class="hero-bars">
            <div class="hero-bar">
              <div class="hero-bar__header">
                <span class="hero-bar__label">开发进度</span>
                <span class="hero-bar__stat">{{ devTaskDone }}/{{ devTaskCount }} 任务</span>
              </div>
              <div class="hero-bar__track">
                <div
                  class="hero-bar__fill"
                  :style="{ width: (version?.devProgress || 0) + '%', background: barColor(version?.devProgress || 0) }"
                />
              </div>
              <span class="hero-bar__pct">{{ version?.devProgress || 0 }}%</span>
            </div>
            <div class="hero-bar">
              <div class="hero-bar__header">
                <span class="hero-bar__label">产品进度</span>
                <span class="hero-bar__stat">{{ version?.acceptanceTaskProgress || 0 }}%</span>
              </div>
              <div class="hero-bar__track">
                <div
                  class="hero-bar__fill"
                  :style="{ width: (version?.acceptanceTaskProgress || 0) + '%', background: barColor(version?.acceptanceTaskProgress || 0) }"
                />
              </div>
              <span class="hero-bar__pct">{{ version?.acceptanceTaskProgress || 0 }}%</span>
            </div>
            <div v-if="version?.planCaseTotal" class="hero-bar">
              <div class="hero-bar__header">
                <span class="hero-bar__label">测试进度</span>
                <span class="hero-bar__stat">{{ version?.planCaseExecuted || 0 }}/{{ version?.planCaseTotal || 0 }} 用例</span>
              </div>
              <div class="hero-bar__track">
                <div
                  class="hero-bar__fill"
                  :style="{ width: (version?.progress || 0) + '%', background: barColor(version?.progress || 0) }"
                />
              </div>
              <span class="hero-bar__pct">{{ version?.progress || 0 }}%</span>
            </div>
          </div>

          <!-- 团队 + 周期 -->
          <div class="hero-meta">
            <div class="hero-meta__team">
              <el-tooltip v-if="version?.manager" :content="`PM: ${version.manager}`" placement="top">
                <el-avatar :size="28" :src="version.managerAvatar || ''" class="hero-avatar">{{ version.manager?.charAt(0) }}</el-avatar>
              </el-tooltip>
              <el-tooltip v-if="version?.devLeader" :content="`开发: ${version.devLeader}`" placement="top">
                <el-avatar :size="28" :src="version.devLeaderAvatar || ''" class="hero-avatar">{{ version.devLeader?.charAt(0) }}</el-avatar>
              </el-tooltip>
              <el-tooltip
                v-for="(tl, idx) in (version?.testLeaderNames || []).slice(0, 2)"
                :key="'hqtl'+idx"
                :content="`测试: ${tl}`"
                placement="top"
              >
                <el-avatar :size="28" :src="(version?.testLeaderAvatars || [])[idx] || ''" class="hero-avatar">{{ tl?.charAt(0) }}</el-avatar>
              </el-tooltip>
            </div>
            <div v-if="version?.startDate || version?.endDate" class="hero-meta__date">
              <el-icon><Calendar /></el-icon>
              {{ version?.startDate || '?' }} ~ {{ version?.endDate || '?' }}
            </div>
            <span v-if="remainDays !== null" :class="['hero-meta__remain', remainDays < 0 ? 'is-overdue' : 'is-safe']">
              {{ remainDays < 0 ? `已逾期 ${-remainDays} 天` : `剩余 ${remainDays} 天` }}
            </span>
          </div>
        </div>

        <!-- 关联信息 -->
        <div v-if="version" class="vdd-hero__links">
          <span v-if="version.storyTitle" class="link-chip link-chip--story">
            <el-icon><Document /></el-icon>{{ version.storyTitle }}
          </span>
          <el-tag
            v-for="p in (version.projectNames || []).slice(0, 4)"
            :key="p"
            size="small"
            effect="plain"
            round
          >{{ p }}</el-tag>
        </div>
      </div>
    </template>

    <!-- ═══ 主体内容 ═══ -->
    <template v-if="version">
      <div class="vdd-body">
        <!-- 胶囊标签栏 -->
        <div class="vdd-tab-bar">
          <button
            v-for="tab in tabItems"
            :key="tab.key"
            :class="['vdd-tab', { 'is-active': activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            <el-icon v-if="tab.icon" class="vdd-tab__icon"><component :is="tab.icon" /></el-icon>
            <span>{{ tab.label }}</span>
            <span v-if="tab.count !== null" class="vdd-tab__count">{{ tab.count }}</span>
          </button>
        </div>

        <!-- 工具栏 -->
        <div v-if="activeTab !== 'desc'" class="vdd-toolbar">
          <el-input
            v-if="activeTab !== 'bug'"
            v-model="taskSearch"
            placeholder="搜索任务..."
            clearable
            :prefix-icon="Search"
            class="vdd-search"
          />
          <el-button v-if="activeTab !== 'bug'" type="primary" size="default" @click="handleAddTask">
            <el-icon><Plus /></el-icon>新建任务
          </el-button>
          <!-- Bug 标签页：跳转至 Bug 管理 -->
          <div v-if="activeTab === 'bug'" class="vdd-toolbar__bug-nav">
            <span class="vdd-toolbar__bug-hint">
              共 {{ localBugs.length }} 条 Bug
            </span>
            <el-button size="default" text type="primary" @click="goToBugList">
              查看全部 <span class="arrow-right">&rarr;</span>
            </el-button>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="vdd-content">
          <!-- 描述 -->
          <div v-if="activeTab === 'desc'" class="desc-panel">
            <div v-if="version.desc" class="rich-text" v-html="version.desc" />
            <div v-else class="empty-state">
              <el-icon :size="40" style="color: var(--text-placeholder)"><Document /></el-icon>
              <p>暂无版本描述</p>
            </div>
          </div>

          <!-- 任务 / Bug -->
          <div v-else class="table-panel">
            <el-table
              :data="activeTab === 'bug' ? localBugs : filteredSearchedTasks"
              size="default"
              class="modern-table"
              height="100%"
              row-key="id"
            >
              <!-- 任务列 -->
              <template v-if="activeTab !== 'bug'">
                <el-table-column label="任务" min-width="260">
                  <template #default="{ row }">
                    <div class="task-cell">
                      <span class="task-cell__dot" :class="taskDotClass(row.status)" />
                      <div class="task-cell__info">
                        <span class="task-cell__name">{{ row.name }}</span>
                        <div class="task-cell__tags">
                          <span class="task-type-tag" :class="row.type === '开发' ? 'task-type-tag--dev' : (row.type === '产品' ? 'task-type-tag--product' : 'task-type-tag--test')">{{ row.type }}</span>
                          <span class="task-meta task-meta--divider">·</span>
                          <el-tag :type="taskStatusType(row.status)" size="small">{{ row.status }}</el-tag>
                          <span v-if="row.assignee_name" class="task-meta task-meta--divider">·</span>
                          <span v-if="row.assignee_name" class="task-meta">
                            <img v-if="row.assignee_avatar" :src="row.assignee_avatar" class="task-meta__avatar" />
                            <span v-else class="task-meta__avatar task-meta__avatar--text">{{ row.assignee_name[0] }}</span>
                            {{ row.assignee_name }}
                          </span>
                          <span v-if="row.deadline" class="task-meta task-meta--divider">·</span>
                          <span v-if="row.deadline" class="task-meta">
                            <el-icon><Calendar /></el-icon>{{ row.deadline }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="优先级" width="80" align="center">
                  <template #default="{ row }">
                    <el-tag :type="taskPriorityType(row.priority)" size="small">{{ row.priority }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="进度" width="180">
                  <template #default="{ row }">
                    <div v-if="row.type === '开发'" class="progress-cell progress-cell--editable" @click="handleProgressPopover(row)">
                      <div class="mini-bar" :class="{ 'is-zero': (row.progress || 0) === 0 }">
                        <div class="mini-bar__fill" :style="{ width: (row.progress || 0) + '%', background: progressColor(row.progress || 0) }" />
                      </div>
                      <span class="mini-bar__pct">{{ row.progress || 0 }}%</span>
                    </div>
                    <div v-else-if="row.type === '测试'" class="progress-cell">
                      <div class="mini-bar" :class="{ 'is-zero': (version?.progress || 0) === 0 }">
                        <div class="mini-bar__fill" :style="{ width: (version?.progress || 0) + '%', background: progressColor(version?.progress || 0) }" />
                      </div>
                      <span class="mini-bar__pct">{{ version?.progress || 0 }}%</span>
                    </div>
                    <div v-else class="progress-cell progress-cell--editable" @click="handleProgressPopover(row)">
                      <div class="mini-bar" :class="{ 'is-zero': (row.progress || 0) === 0 }">
                        <div class="mini-bar__fill" :style="{ width: (row.progress || 0) + '%', background: progressColor(row.progress || 0) }" />
                      </div>
                      <span class="mini-bar__pct">{{ row.progress || 0 }}%</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100" fixed="right" align="center">
                  <template #default="{ row }">
                    <el-button size="small" link type="primary" @click="handleEditTask(row)">编辑</el-button>
                    <el-button size="small" link type="danger" @click="handleDeleteTask(row)">删除</el-button>
                  </template>
                </el-table-column>
              </template>

              <!-- Bug 列 -->
              <template v-if="activeTab === 'bug'">
                <el-table-column label="Bug 标题" min-width="200" show-overflow-tooltip>
                  <template #default="{ row }">
                    <div class="task-cell">
                      <span class="task-cell__dot" :class="bugDotClass(row.status)" />
                      <span class="task-cell__name bug-cell__title">{{ row.title }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="严重程度" width="85" align="center">
                  <template #default="{ row }">
                    <el-tag :type="bugSeverityType(row.severity)" size="small">{{ row.severity }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="优先级" width="65" align="center">
                  <template #default="{ row }">
                    <el-tag :type="bugPriorityType(row.priority)" size="small">{{ row.priority }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="80" align="center">
                  <template #default="{ row }">
                    <el-tag :type="bugStatusType(row.status)" size="small">{{ row.status }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="处理人" width="110">
                  <template #default="{ row }">
                    <span v-if="row.assignee_name" class="task-meta">
                      <img v-if="row.assignee_avatar" :src="row.assignee_avatar" class="task-meta__avatar" />
                      <span v-else class="task-meta__avatar task-meta__avatar--text">{{ row.assignee_name[0] }}</span>
                      {{ row.assignee_name }}
                    </span>
                    <span v-else class="task-meta" style="color: var(--text-placeholder)">-</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="70" fixed="right" align="center">
                  <template #default="{ row }">
                    <el-button size="small" link type="primary" @click="openBug(row)">查看</el-button>
                  </template>
                </el-table-column>
              </template>

              <template #empty>
                <div class="empty-state">
                  <el-icon :size="36" style="color: var(--text-placeholder)">
                    <Tickets v-if="activeTab !== 'bug'" />
                    <WarningFilled v-else />
                  </el-icon>
                  <p>{{ activeTab === 'bug' ? '暂无关联 Bug' : '暂无任务' }}</p>
                  <el-button v-if="activeTab !== 'bug'" type="primary" size="small" @click="handleAddTask">新建任务</el-button>
                </div>
              </template>
            </el-table>
          </div>
        </div>
      </div>
    </template>

    <!-- 进度编辑弹窗 -->
    <teleport to="body">
      <div v-if="editingProgressId" class="progress-overlay" @click="editingProgressId = null">
        <div class="progress-dialog" @click.stop>
          <div class="progress-dialog__header">
            <span>调整进度</span>
            <span class="progress-dialog__val">{{ editingProgressVal }}%</span>
          </div>
          <el-slider
            v-model="editingProgressVal"
            :min="0"
            :max="100"
            :step="5"
            :show-tooltip="false"
            class="progress-slider"
          />
          <div class="progress-dialog__footer">
            <el-button size="small" @click="editingProgressId = null">取消</el-button>
            <el-button size="small" type="primary" @click="handleProgressSave">确定</el-button>
          </div>
        </div>
      </div>
    </teleport>

    <TaskDialog
      v-model:visible="taskDialogVisible"
      :editing-id="taskEditingId"
      :initial-form="taskEditingForm"
      :version-list="versionListForTask"
      :user-list="userList"
      @saved="onTaskSaved"
    />
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Calendar, Document, Plus, Tickets, WarningFilled, CircleCheckFilled,
  Search, ArrowLeft,
} from '@element-plus/icons-vue';
import { updateTask, deleteTask, getTaskList } from '@/api/task';
import {
  submitTest, passTest, rejectTest,
  submitAcceptance, passAcceptance, rejectAcceptance,
} from '@/api/version';
import { getUserList } from '@/api/user';
import { getBugList } from '@/api/bug';
import TaskDialog from '@/views/task/components/TaskDialog.vue';

const props = defineProps({
  visible: Boolean,
  version: { type: Object, default: null },
});

const emit = defineEmits(['update:visible', 'refreshList', 'edit']);

const router = useRouter();
const store = useStore();
const activeTab = ref('all');
const taskSearch = ref('');

const localTasks = ref([]);
const localBugs = ref([]);
const userList = ref([]);

const taskTotal = computed(() => localTasks.value.length);
const taskDone = computed(() => localTasks.value.filter((t) => t.status === '已完成').length);
const bugCount = computed(() => localBugs.value.length);
const devTaskCount = computed(() => localTasks.value.filter((t) => t.type === '开发').length);
const devTaskDone = computed(() => localTasks.value.filter((t) => t.type === '开发' && t.status === '已完成').length);
const testTaskCount = computed(() => localTasks.value.filter((t) => t.type === '测试').length);
const acceptanceTaskCount = computed(() => localTasks.value.filter((t) => t.type === '产品').length);

const tabItems = computed(() => [
  { key: 'all', label: '全部任务', icon: Tickets, count: taskTotal.value },
  { key: 'dev', label: '开发', icon: null, count: devTaskCount.value },
  { key: 'test', label: '测试', icon: null, count: testTaskCount.value },
  { key: 'acceptance', label: '产品', icon: null, count: acceptanceTaskCount.value },
  { key: 'bug', label: 'Bug', icon: WarningFilled, count: bugCount.value },
  { key: 'desc', label: '描述', icon: Document, count: null },
]);

const remainDays = computed(() => {
  if (!props.version?.endDate) return null;
  const end = new Date(props.version.endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
});

const filteredSearchedTasks = computed(() => {
  let list = localTasks.value;
  if (activeTab.value === 'dev') list = list.filter((t) => t.type === '开发');
  if (activeTab.value === 'test') list = list.filter((t) => t.type === '测试');
  if (activeTab.value === 'acceptance') list = list.filter((t) => t.type === '产品');
  if (taskSearch.value) {
    const q = taskSearch.value.toLowerCase();
    list = list.filter((t) => t.name.toLowerCase().includes(q));
  }
  return list;
});

// ── Hero 提测按钮逻辑 ──
const canSubmitTest = computed(() => {
  const ts = props.version?.test_status;
  return (!ts || ts === '未提测' || ts === '测试驳回') && props.version?.status === '进行中';
});
const canPassTest = computed(() => props.version?.test_status === '测试中');
const canRejectTest = computed(() => props.version?.test_status === '测试中');
const testStatusTagType = computed(() => ({
  测试中: 'warning',
  测试通过: 'success',
  测试驳回: 'danger',
}[props.version?.test_status] || 'info'));

const currentRoles = computed(() => store.getters.roles);

// ── Hero 验收按钮逻辑 ──
// 提交验收：仅开发/测试人员可见，验收状态为待验收或验收驳回时
const canSubmitAcceptance = computed(() => {
  const as = props.version?.acceptance_status;
  return currentRoles.value.some(r => ['开发', '测试'].includes(r))
    && props.version?.test_status === '测试通过'
    && (!as || as === '待验收' || as === '验收驳回');
});
// 验收通过/驳回：仅产品人员可见，验收状态为验收中时
const canPassAcceptance = computed(() =>
  currentRoles.value.some(r => r.includes('产品')) && props.version?.acceptance_status === '验收中'
);
const canRejectAcceptance = computed(() =>
  currentRoles.value.some(r => r.includes('产品')) && props.version?.acceptance_status === '验收中'
);
const acceptanceStatusTagType = computed(() => ({
  验收中: 'primary',
  验收通过: 'success',
  验收驳回: 'danger',
}[props.version?.acceptance_status] || 'info'));

const handleSubmitTestFromHero = async () => {
  try {
    await ElMessageBox.prompt('测试说明（可选）', '确认提测', {
      confirmButtonText: '提测',
      inputPlaceholder: '给QA的备注信息...',
      inputType: 'textarea',
    }).then(async ({ value }) => {
      await submitTest(props.version.id, value || '');
      ElMessage.success('已提测，QA将收到通知');
      emit('refreshList');
    }).catch(() => {});
  } catch { /* cancel */ }
};
const handlePassTestFromHero = async () => {
  try {
    await ElMessageBox.confirm(`确定「${props.version?.name}」测试通过？`, '确认', { type: 'success' });
    await passTest(props.version.id);
    ElMessage.success('测试通过');
    emit('refreshList');
  } catch { /* cancel */ }
};
const handleRejectTestFromHero = async () => {
  try {
    await ElMessageBox.prompt('驳回原因', '测试驳回', {
      confirmButtonText: '驳回',
      inputPlaceholder: '描述发现的问题...',
      inputType: 'textarea',
    }).then(async ({ value }) => {
      await rejectTest(props.version.id, value || '');
      ElMessage.success('已驳回');
      emit('refreshList');
    }).catch(() => {});
  } catch { /* cancel */ }
};

// ── 验收操作 ──
const handleSubmitAcceptanceFromHero = async () => {
  try {
    await ElMessageBox.confirm(`确定将「${props.version?.name}」提交产品验收？`, '确认', { type: 'primary' });
    await submitAcceptance(props.version.id);
    ElMessage.success('已提交验收，产品将收到通知');
    emit('refreshList');
    emit('update:visible', false);
  } catch { /* cancel */ }
};

const handlePassAcceptanceFromHero = async () => {
  try {
    await ElMessageBox.confirm(`确定「${props.version?.name}」验收通过？`, '确认', { type: 'success' });
    await passAcceptance(props.version.id);
    ElMessage.success('验收通过，版本已完成');
    emit('refreshList');
    emit('update:visible', false);
  } catch { /* cancel */ }
};

const handleRejectAcceptanceFromHero = async () => {
  try {
    await ElMessageBox.prompt('驳回原因', '验收驳回', {
      confirmButtonText: '驳回',
      inputPlaceholder: '描述需要改进的问题...',
      inputType: 'textarea',
    }).then(async ({ value }) => {
      await rejectAcceptance(props.version.id, value || '');
      ElMessage.success('已驳回');
      emit('refreshList');
      emit('update:visible', false);
    }).catch(() => {});
  } catch { /* cancel */ }
};

const handleEditVersion = () => {
  emit('edit', props.version);
  emit('update:visible', false);
};

const goToBugList = () => {
  if (!props.version) return;
  router.push({
    path: '/test/bug',
    query: { versionId: props.version.id, versionName: props.version.name },
  });
};

// ── 进度颜色 ──
const overallProgress = computed(() => {
  const tasks = localTasks.value;
  if (tasks.length === 0) return 0;
  const sum = tasks.reduce((acc, t) => acc + (t.progress || 0), 0);
  return Math.round(sum / tasks.length);
});
const progressGradientStart = computed(() => {
  const p = overallProgress.value;
  if (p <= 0) return 'var(--text-placeholder)';
  if (p < 50) return 'var(--el-color-primary)';
  return 'var(--el-color-success)';
});
const progressGradientEnd = computed(() => {
  const p = overallProgress.value;
  if (p <= 0) return 'var(--text-placeholder)';
  if (p < 50) return 'var(--el-color-primary-light-5)';
  if (p < 80) return 'var(--el-color-primary)';
  return '#17b26a';
});
const barColor = (p: number) => {
  if (p <= 0) return 'var(--text-placeholder)';
  if (p < 30) return 'var(--text-secondary)';
  if (p < 70) return 'var(--el-color-primary)';
  return 'var(--el-color-success)';
};
const progressColor = (p: number) => {
  if (p <= 0) return 'var(--text-placeholder)';
  if (p < 30) return 'var(--text-secondary)';
  if (p < 70) return 'var(--el-color-primary)';
  return 'var(--el-color-success)';
};

// ── 数据加载 ──
const loadData = async () => {
  if (!props.version) return;
  try {
    const [taskRes, bugRes, userRes] = await Promise.all([
      getTaskList({ versionId: props.version.id, page: 1, pageSize: 999 }),
      getBugList({ versionId: props.version.id, page: 1, pageSize: 999 }),
      getUserList(),
    ]);
    localTasks.value = (taskRes.data.list || []).map((t) => ({
      ...t,
      assignee_name: t.assignee_name || '',
    }));
    localBugs.value = (bugRes.data.list || []).map((b) => ({
      ...b,
      assignee_name: b.assignee_name || '',
    }));
    userList.value = (userRes.data || []).map((u) => ({
      id: u.id,
      label: u.first_name || u.username,
      avatar: u.avatar || '',
      dept: u.dept || '',
    }));
  } catch { /* ignore */ }
};

watch(() => props.visible, (val) => {
  if (val) { activeTab.value = 'all'; taskSearch.value = ''; loadData(); }
});

const versionListForTask = computed(() => {
  if (!props.version) return [];
  return [{ id: props.version.id, name: props.version.name }];
});

// ── 任务 CRUD ──
const taskDialogVisible = ref(false);
const taskEditingId = ref(null);
const taskEditingForm = ref(null);

const handleAddTask = () => {
  taskEditingId.value = null;
  taskEditingForm.value = {
    name: '',
    version: props.version?.id || null,
    type: activeTab.value === 'acceptance' ? '产品' : (activeTab.value === 'test' ? '测试' : '开发'),
    priority: '中',
    status: '未开始',
    assignee: null,
    deadline: props.version?.endDate || '',
    progress: 0,
    description: '',
  };
  taskDialogVisible.value = true;
};

const handleEditTask = (row) => {
  taskEditingId.value = row.id;
  taskEditingForm.value = {
    name: row.name,
    version: row.version || props.version?.id || null,
    type: row.type || '开发',
    priority: row.priority,
    status: row.status,
    assignee: row.assignee || null,
    deadline: row.deadline || '',
    progress: row.progress || 0,
    description: row.description || '',
  };
  taskDialogVisible.value = true;
};

const handleDeleteTask = (row) => {
  ElMessageBox.confirm(`确定删除任务「${row.name}」？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteTask(row.id);
      ElMessage.success('已删除');
      loadData();
      emit('refreshList');
    })
    .catch(() => {});
};

// ── Bug 跳转 ──
const openBug = (bug) => {
  router.push({ path: '/test/bug', query: { openId: bug.id } });
};

// ── 进度编辑 ──
const editingProgressId = ref(null);
const editingProgressVal = ref(0);
let editingRow = null;

const handleProgressPopover = (row) => {
  editingProgressId.value = row.id;
  editingProgressVal.value = row.progress || 0;
  editingRow = row;
};

const handleProgressSave = async () => {
  if (!editingRow) return;
  try {
    const payload: any = { progress: editingProgressVal.value };
    if (editingProgressVal.value >= 100) payload.status = '已完成';
    await updateTask(editingRow.id, payload);
    editingRow.progress = editingProgressVal.value;
    if (editingProgressVal.value >= 100) editingRow.status = '已完成';
    ElMessage.success('进度已更新');
    editingProgressId.value = null;
    editingRow = null;
    emit('refreshList');
  } catch { editingProgressId.value = null; editingRow = null; }
};

const onTaskSaved = () => { loadData(); emit('refreshList'); };

// ── 样式辅助 ──
const taskDotClass = (s: string) => ({
  未开始: '',
  进行中: 'is-active',
  已完成: 'is-done',
}[s] || '');
const bugDotClass = (s: string) => ({
  待处理: '',
  处理中: 'is-active',
  已解决: 'is-done',
  已关闭: 'is-done',
  已拒绝: 'is-rejected',
}[s] || '');

const statusType = (s: string) => ({
  未开始: 'info', 进行中: 'primary', 已完成: 'success', 已暂停: 'warning',
}[s] || 'info');
const taskStatusType = (s: string) => ({
  未开始: 'info', 进行中: 'primary', 已完成: 'success',
}[s] || 'info');
const taskPriorityType = (p: string) => ({
  高: 'warning', 中: 'info', 低: '',
}[p] || 'info');
const bugSeverityType = (s: string) => ({
  致命: 'danger', 严重: 'warning', 一般: 'info', 轻微: '', 建议: '',
}[s] || 'info');
const bugPriorityType = (p: string) => ({
  P0: 'danger', P1: 'warning', P2: 'info', P3: '',
}[p] || 'info');
const bugStatusType = (s: string) => ({
  待处理: 'info', 处理中: 'primary', 已解决: 'success', 已关闭: '', 已拒绝: 'danger',
}[s] || 'info');

import { nextTick } from 'vue';
</script>

<style scoped lang="scss">
/* ══════════════════════════════════════════════
   版本详情 — 2026 现代 SaaS 设计
   设计语言：空间感 / 玻璃态 / 微动效 / 无边界
   ══════════════════════════════════════════════ */

.version-detail-dialog {
  :deep(.el-dialog) {
    border-radius: 20px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    padding: 0;
    margin-right: 0;
    border-bottom: none;
  }

  :deep(.el-dialog__body) {
    padding: 0;
  }
}

/* ═══ HERO 头部 ═══ */
.vdd-hero {
  padding: 24px 32px 20px;
  background:
    radial-gradient(ellipse 80% 120% at 85% 0%, rgba(64, 158, 255, 0.06), transparent 60%),
    radial-gradient(ellipse 60% 100% at 15% 100%, rgba(103, 194, 58, 0.05), transparent 60%),
    var(--bg-card);
  border-bottom: 1px solid var(--border-light);

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__back {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.15s;
    &:hover { background: var(--bg-hover); color: var(--text-primary); }
  }

  &__name {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.5px;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__metrics {
    display: flex;
    align-items: center;
    gap: 32px;
    flex-wrap: wrap;
  }

  &__links {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--border-light);
    flex-wrap: wrap;
  }
}

/* ── 进度环 ── */
.hero-progress-ring {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;

  .ring-svg {
    width: 100%;
    height: 100%;
  }

  .ring-fill {
    transition: stroke-dashoffset 0.8s cubic-bezier(.34, 1.56, .64, 1);
  }
}

.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &__value {
    font-size: 22px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.5px;
    line-height: 1;
  }

  &__label {
    font-size: 10px;
    color: var(--text-secondary);
    margin-top: 2px;
    font-weight: 500;
  }
}

/* ── 双进度条 ── */
.hero-bars {
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero-bar {
  display: flex;
  align-items: center;
  gap: 12px;

  &__header {
    display: flex;
    flex-direction: column;
    min-width: 72px;
  }

  &__label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  &__stat {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-regular);
    font-variant-numeric: tabular-nums;
  }

  &__track {
    flex: 1;
    height: 8px;
    background: var(--bg-hover);
    border-radius: 4px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.6s cubic-bezier(.34, 1.56, .64, 1);
  }

  &__pct {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    min-width: 36px;
    text-align: right;
  }
}

/* ── Hero 元信息 ── */
.hero-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;

  &__team {
    display: flex;
    gap: 4px;

    .hero-avatar {
      background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
      color: #fff;
      font-size: 12px;
    }
  }

  &__date {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  &__remain {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 8px;

    &.is-overdue {
      color: var(--el-color-danger);
      background: var(--el-color-danger-light-9);
    }
    &.is-safe {
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
    }
  }
}

.link-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-regular);
  &--story { color: var(--el-color-primary); font-weight: 500; }
}

/* ═══ 主体 ═══ */
.vdd-body {
  display: flex;
  flex-direction: column;
  height: 520px;
}

/* ── 胶囊标签栏 ── */
.vdd-tab-bar {
  display: flex;
  gap: 4px;
  padding: 12px 32px;
  background: var(--bg-card);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 5;
}

.vdd-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;

  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  &.is-active {
    background: var(--bg-card);
    color: var(--text-primary);
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }

  &__icon { font-size: 14px; }

  &__count {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-weight: 600;
  }

  &.is-active &__count {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

/* ── 工具栏 ── */
.vdd-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 32px;
  flex-shrink: 0;
}

.vdd-search {
  width: 240px;
}

.vdd-toolbar__bug-nav {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}

.vdd-toolbar__bug-hint {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.vdd-toolbar__bug-nav .arrow-right {
  display: inline-block;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-size: 14px;
}
.vdd-toolbar__bug-nav .el-button:hover .arrow-right {
  transform: translateX(3px);
}

/* ── 内容区 ── */
.vdd-content {
  flex: 1;
  overflow: hidden;
}

.desc-panel {
  padding: 24px 32px;
  overflow-y: auto;
  height: 100%;
}

.rich-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  :deep(img) { max-width: 100%; border-radius: 8px; }
  :deep(table) {
    border-collapse: collapse; width: 100%; margin: 8px 0;
    td, th { border: 1px solid var(--border-light); padding: 8px 12px; font-size: 13px; }
  }
}

.table-panel {
  height: 100%;
  padding: 0 32px 20px;
  overflow: hidden;
}

/* ═══ 现代表格 ═══ */
.modern-table {
  border: none !important;

  :deep(.el-table__header-wrapper) {
    th.el-table__cell {
      background: var(--bg-card);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-bottom: 2px solid var(--border-light) !important;
      border-right: none !important;
      font-weight: 650;
      font-size: 11px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 0;
    }
  }

  :deep(.el-table__body-wrapper) {
    td.el-table__cell {
      border-bottom: 1px solid var(--border-light) !important;
      border-right: none !important;
      padding: 14px 0;
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none !important; }
    tr:hover > td { background: var(--bg-hover) !important; }
  }

  :deep(.el-table__cell) {
    border-right: none !important;
  }

  :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
    background: transparent;
  }

  // ── 表格内标签统一现代化 ──
  :deep(.el-tag) {
    border-radius: 5px;
    border: none;
    font-weight: 600;
    font-size: 11px;
    height: 22px;
    line-height: 22px;
    padding: 0 8px;
    letter-spacing: 0.2px;

    &.el-tag--info { background: var(--bg-hover); color: var(--text-regular); }
    &.el-tag--primary { background: var(--el-color-primary-light-8); color: var(--el-color-primary); }
    &.el-tag--success { background: var(--el-color-success-light-8); color: var(--el-color-success); }
    &.el-tag--warning { background: var(--el-color-warning-light-8); color: var(--el-color-warning); }
    &.el-tag--danger { background: var(--el-color-danger-light-8); color: var(--el-color-danger); }
  }
}

/* ── 任务类型标签 ── */
.task-type-tag {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 0 8px;
  height: 22px;
  border-radius: 5px;
  letter-spacing: 0.2px;
  background: var(--bg-hover);
  color: var(--text-secondary);

  &--dev { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &--test { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &--product { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
}

/* ── 任务行 ── */
.task-cell {
  display: flex;
  align-items: flex-start;
  gap: 12px;

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 6px;
    flex-shrink: 0;
    background: var(--border-color);
    transition: background 0.2s;

    &.is-active { background: var(--el-color-primary); box-shadow: 0 0 0 3px var(--el-color-primary-light-7); }
    &.is-done { background: var(--el-color-success); }
    &.is-rejected { background: var(--el-color-danger); }
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    display: block;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // Bug 标题列专用：无下边距，行内截断
  .bug-cell__title {
    margin-bottom: 0;
    flex: 1;
    min-width: 0;
  }

  &__tags {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
}

.task-meta {
  font-size: 12px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 3px;

  &--divider {
    color: var(--text-placeholder);
    font-weight: 400;
  }

  &__avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    object-fit: cover;
    &--text {
      background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
      color: #fff;
      font-size: 9px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }
}

/* ── 进度条 ── */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  &--editable {
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 6px;
    transition: background 0.15s;
    &:hover { background: var(--bg-hover); }
  }
}

.mini-bar {
  flex: 1;
  max-width: 80px;
  height: 6px;
  background: var(--bg-hover);
  border-radius: 3px;
  overflow: hidden;

  &--test { max-width: 80px; }

  &__fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(.34, 1.56, .64, 1);
  }

  &.is-zero &__fill { background: var(--text-placeholder) !important; }

  &__pct {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-regular);
    font-variant-numeric: tabular-nums;
    min-width: 32px;
  }
}

/* ── 空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 0;
  p { color: var(--text-secondary); font-size: 13px; margin: 0; }
}

/* ── 进度弹窗 ── */
.progress-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-dialog {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 24px;
  width: 320px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__val {
    font-size: 24px;
    font-weight: 800;
    color: var(--el-color-primary);
    font-variant-numeric: tabular-nums;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
}

.progress-slider {
  :deep(.el-slider__runway) { height: 6px; }
  :deep(.el-slider__bar) { height: 6px; }
  :deep(.el-slider__button-wrapper) { top: -15px; }
  :deep(.el-slider__button) { width: 16px; height: 16px; border: 2px solid var(--el-color-primary); }}</style>
