<template>
  <div class="okr-shell">
    <!-- ── 顶部命令栏 ── -->
    <div class="command-bar">
      <div class="command-bar__context">
        <div class="context-period">
          <el-select v-model="selectedPeriodId" placeholder="选择周期" class="period-select" @change="handlePeriodChange">
            <el-option v-for="p in periods" :key="p.id" :label="p.name" :value="p.id">
              <span style="float:left">{{ p.name }}</span>
              <el-tag v-if="p.status === '已关闭'" size="small" type="info" effect="plain" style="float:right;margin-left:8px">关闭</el-tag>
            </el-option>
          </el-select>
          <span v-if="activePeriod" class="context-period__range">{{ activePeriod.start_date }} ~ {{ activePeriod.end_date }}</span>
        </div>
      </div>

      <div class="command-bar__actions">
        <template v-if="activePeriod?.status === '进行中'">
          <el-button v-if="isViewingSelf" size="small" plain @click="periodDialogVisible = true">周期</el-button>
          <el-button v-if="isAdmin && !isViewingSelf && viewingMemberId" size="small" plain @click="handleUrgeMembers"><el-icon><Bell /></el-icon>催促</el-button>
          <el-button v-if="isViewingSelf && hasAnyDraft" type="primary" @click="handleSubmitForReview">提交审核</el-button>
        </template>
        <el-button v-if="isViewingSelf" type="primary" :disabled="!selectedPeriodId" @click="handleAddObjective"><el-icon><Plus /></el-icon>新建目标</el-button>
      </div>
    </div>

    <!-- ── 数据看板（管理员可见） ── -->
    <div v-if="isAdmin && dashboardData && selectedPeriodId" class="dash-bar">
      <div class="dash-tile"><span class="dash-val">{{ dashboardData.total_members }}</span><span class="dash-lbl">成员总数</span></div>
      <div class="dash-tile"><span class="dash-val dash-c-not">{{ dashboardData.not_started }}</span><span class="dash-lbl">未开始</span></div>
      <div class="dash-tile"><span class="dash-val dash-c-draft">{{ dashboardData.draft }}</span><span class="dash-lbl">草稿中</span></div>
      <div class="dash-tile"><span class="dash-val dash-c-sub">{{ dashboardData.submitted }}</span><span class="dash-lbl">待审核</span></div>
      <div class="dash-tile"><span class="dash-val dash-c-rej">{{ dashboardData.rejected }}</span><span class="dash-lbl">已驳回</span></div>
      <div class="dash-tile"><span class="dash-val dash-c-ok">{{ dashboardData.approved }}</span><span class="dash-lbl">已通过</span></div>
    </div>

    <!-- ── 主体布局 ── -->
    <div class="okr-body">
      <OKRMemberSidebar ref="sidebarRef" :user-list="userList" @select="handleMemberSelect" />

      <div class="okr-content">
        <!-- 查看他人提示 -->
        <div v-if="!isViewingSelf && viewingMemberName" class="who-banner">
          <span class="who-banner__label">正在查看</span>
          <strong class="who-banner__name">{{ viewingMemberName }}</strong>
          <span class="who-banner__suffix">的 OKR</span>
          <span v-if="hasAnySubmitted" class="who-banner__badge">{{ objectives.filter(o => o.review_status === 'submitted').length }} 待审核</span>
        </div>

        <!-- 统计仪表盘 -->
        <div v-if="selectedPeriodId && objectives.length" class="stats-dash">
          <div class="stat-tile">
            <span class="stat-tile__value">{{ objectives.length }}</span>
            <span class="stat-tile__label">目标</span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile__value">{{ totalKRs }}</span>
            <span class="stat-tile__label">关键结果</span>
          </div>
          <div class="stat-tile stat-tile--progress">
            <span class="stat-tile__value">{{ Math.round(overallProgress) }}<small>%</small></span>
            <span class="stat-tile__label">整体进度</span>
            <div class="stat-tile__ring">
              <svg viewBox="0 0 36 36"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--el-border-color-light)" stroke-width="3"/><path :stroke-dasharray="`${Math.round(overallProgress)}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="var(--el-color-primary)" stroke-width="3" stroke-linecap="round"/></svg>
            </div>
          </div>
          <div v-if="!isViewingSelf" class="stat-tile">
            <span class="stat-tile__value">{{ objectives.filter(o => o.review_status === 'approved').length }}</span>
            <span class="stat-tile__label">已通过</span>
          </div>
        </div>

        <!-- 内容区 -->
        <div v-loading="loading" class="objective-list">
          <!-- 空状态 -->
          <div v-if="!selectedPeriodId" class="empty-place">
            <div class="empty-place__icon"><el-icon><Aim /></el-icon></div>
            <p class="empty-place__title">选择 OKR 周期</p>
            <p class="empty-place__desc">创建或选择一个周期，开始制定团队目标</p>
          </div>
          <div v-else-if="isAdmin && !viewingMemberId" class="empty-place">
            <div class="empty-place__icon"><el-icon><UserFilled /></el-icon></div>
            <p class="empty-place__title">选择一名成员</p>
            <p class="empty-place__desc">从左侧列表中选择成员，查看其 OKR</p>
          </div>
          <div v-else-if="!objectives.length" class="empty-place">
            <div class="empty-place__icon"><el-icon><Flag /></el-icon></div>
            <p class="empty-place__title" v-if="!isViewingSelf">{{ viewingMemberName }} 暂无已提交的 OKR</p>
            <p class="empty-place__title" v-else>暂无目标</p>
            <p class="empty-place__desc" v-if="isViewingSelf">开始制定你的 OKR 吧</p>
          </div>

          <!-- O 卡片 -->
          <div
            v-for="(obj, objIndex) in objectives"
            :key="obj.id"
            class="o-card"
            :class="`o-card--${obj.review_status}`"
          >
            <div class="o-card__glow"></div>
            <div class="o-card__body">
              <!-- 头部 -->
              <div class="o-card__head">
                <span class="align-seq">{{ objIndex + 1 }}</span>
                <div class="o-card__head-main">
                  <span class="o-card__badge" :class="`badge-${obj.review_status}`">{{ reviewStatusLabel(obj.review_status) }}</span>
                  <span class="o-card__title">{{ obj.title }}</span>
                  <!-- 对齐上级 -->
                  <span v-if="obj.parent_owner_name" class="align-tag align-tag--parent">
                    <el-icon :size="12"><Connection /></el-icon>
                    {{ obj.parent_owner_name }}
                  </span>
                  <!-- 对齐下级 -->
                  <span v-for="child in obj.children_info" :key="'c'+child.id" class="align-tag align-tag--child">
                    <el-icon :size="12"><Connection /></el-icon>
                    {{ child.owner_name }}
                  </span>
                  <template v-if="obj.mentioned_users?.length">
                    <span class="kr-row__mentions o-card__mentions">
                      <el-tooltip :content="obj.mentioned_users.map(u => u.name).join(', ')" placement="top">
                        <span class="mention-avatars">
                          <template v-for="(u, i) in obj.mentioned_users.slice(0, 3)" :key="u.id">
                            <img v-if="u.avatar" class="mention-avatar" :src="u.avatar" :alt="u.name" />
                            <span v-else class="mention-avatar mention-avatar--fallback">{{ u.name[0] }}</span>
                          </template>
                          <span v-if="obj.mentioned_users.length > 3" class="mention-more">+{{ obj.mentioned_users.length - 3 }}</span>
                        </span>
                      </el-tooltip>
                    </span>
                  </template>
                </div>
                <div class="o-card__head-side">
                  <div v-if="isViewingLeader && obj.review_status === 'submitted'" class="review-actions">
                    <el-button size="small" text type="success" @click="handleReview(obj, 'approve')">通过</el-button>
                    <el-button size="small" text type="danger" @click="handleReview(obj, 'reject')">驳回</el-button>
                  </div>
                  <div v-if="isViewingSelf" class="card-ops">
                    <el-button size="small" text @click="handleAddKR(obj)">+KR</el-button>
                    <el-button v-if="obj.review_status === 'submitted'" size="small" text @click="handleWithdrawReview(obj)">撤回</el-button>
                    <el-button size="small" :type="obj.review_status === 'rejected' ? 'warning' : 'text'" :plain="obj.review_status === 'rejected'" @click="handleEditObjective(obj)">
                      {{ obj.review_status === 'rejected' ? '修订' : '编辑' }}
                    </el-button>
                    <el-button size="small" text type="danger" @click="handleDeleteObjective(obj)">删除</el-button>
                  </div>
                </div>
              </div>

              <!-- 审核反馈 -->
              <div v-if="obj.review_comment" class="feedback-bar" :class="{ 'feedback-bar--rejected': obj.review_status === 'rejected', 'feedback-bar--approved': obj.review_status === 'approved' }">
                <span class="feedback-bar__icon">
                  <el-icon v-if="obj.review_status === 'rejected'"><WarningFilled /></el-icon>
                  <el-icon v-else-if="obj.review_status === 'approved'"><SuccessFilled /></el-icon>
                  <el-icon v-else><InfoFilled /></el-icon>
                </span>
                <span class="feedback-bar__text">{{ obj.review_comment }}</span>
                <span v-if="obj.reviewed_by_name" class="feedback-bar__author">{{ obj.reviewed_by_name }}</span>
              </div>

              <!-- 进度条 -->
              <div class="o-card__progress">
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: Math.round(obj.progress || 0) + '%', background: progressColor(obj.progress) }"></div>
                </div>
                <span class="progress-num">{{ Math.round(obj.progress || 0) }}%</span>
              </div>

              <!-- KR 列表 -->
              <div v-if="obj.key_results?.length" class="kr-section">
                <div v-for="kr in obj.key_results" :key="kr.id" class="kr-row" :class="{ 'kr-row--done': kr.progress >= 100 }">
                  <div class="kr-row__main">
                    <span v-if="kr.progress >= 100" class="kr-row__check"><el-icon><CircleCheckFilled /></el-icon></span>
                    <span class="kr-row__title">{{ kr.title }}</span>
                    <span class="kr-row__pct" :style="{ color: progressColor(kr.progress) }">{{ Math.round(kr.progress || 0) }}%</span>
                    <el-tooltip :content="'信心 ' + (kr.confidence || 5) + '/5 — ' + (kr.confidence >= 5 ? '很有信心' : kr.confidence >= 3 ? '比较有把握' : '把握不大')" placement="top">
                      <span class="kr-row__confidence" :class="confidenceClass(kr.confidence)">信{{ kr.confidence || 5 }}</span>
                    </el-tooltip>
                    <template v-if="kr.mentioned_users?.length">
                      <span class="kr-row__mentions">
                        <el-tooltip :content="kr.mentioned_users.map(u => u.name).join(', ')" placement="top">
                          <span class="mention-avatars">
                            <template v-for="(u, i) in kr.mentioned_users.slice(0, 3)" :key="u.id">
                              <img v-if="u.avatar" class="mention-avatar" :src="u.avatar" :alt="u.name" />
                              <span v-else class="mention-avatar mention-avatar--fallback">{{ u.name[0] }}</span>
                            </template>
                            <span v-if="kr.mentioned_users.length > 3" class="mention-more">+{{ kr.mentioned_users.length - 3 }}</span>
                          </span>
                        </el-tooltip>
                      </span>
                    </template>
                  </div>
                  <div class="kr-row__bar">
                    <span class="kr-row__range">{{ kr.start_value }}{{ kr.unit }}</span>
                    <div class="kr-minibar"><div class="kr-minibar__fill" :style="{ width: Math.round(kr.progress || 0) + '%', background: progressColor(kr.progress) }"></div></div>
                    <span class="kr-row__range">{{ kr.target_value }}{{ kr.unit }}</span>
                  </div>
                  <div v-if="isViewingSelf" class="kr-row__ops">
                    <el-button size="small" text type="primary" @click="handleUpdateProgress(kr)">更新</el-button>
                    <el-button size="small" text @click="handleEditKR(kr, obj)">编辑</el-button>
                    <el-button size="small" text type="danger" @click="handleDeleteKR(kr)">删除</el-button>
                  </div>
                </div>
              </div>

              <!-- KR 占位 -->
              <div v-else-if="isViewingSelf" class="kr-addon">
                <el-button text type="primary" @click="handleAddKR(obj)"><el-icon><Plus /></el-icon>添加关键结果</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <PeriodDialog v-model:visible="periodDialogVisible" @saved="handlePeriodSaved" />
    <ObjectiveDialog v-model:visible="objectiveDialogVisible" :editing="editingObjective" :user-list="userList" :period-id="selectedPeriodId" @saved="handleObjectiveSaved" />
    <KRDialog v-model:visible="krDialogVisible" :editing="editingKR" :is-last="isLastKR" :user-list="userList" @saved="handleKRSaved" />
    <ProgressDialog v-model:visible="progressDialogVisible" :kr="progressKR" @saved="handleProgressSaved" />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Aim, Flag, CircleCheckFilled, Bell, UserFilled, Connection, WarningFilled, SuccessFilled, InfoFilled } from '@element-plus/icons-vue';
import {
  getPeriodList, createPeriod, updatePeriod,
  getObjectiveList, createObjective, updateObjective, deleteObjective,
  createKR, updateKR, deleteKR, updateKRProgress,
  submitForReview, reviewObjective, urgeMembers, getDashboard,
  withdrawReview,
} from '@/api/okr';
import { getUserList } from '@/api/user';
import PeriodDialog from './components/PeriodDialog.vue';
import ObjectiveDialog from './components/ObjectiveDialog.vue';
import KRDialog from './components/KRDialog.vue';
import ProgressDialog from './components/ProgressDialog.vue';
import OKRMemberSidebar from './components/OKRMemberSidebar.vue';

const store = useStore();
const periods = ref([]);
const objectives = ref([]);
const userList = ref([]);
const loading = ref(false);
const selectedPeriodId = ref(null);
const sidebarRef = ref(null);

const viewingMemberId = ref(null);
const viewingMemberName = ref('');
const viewingMemberLeaderId = ref(null);
const dashboardData = ref(null);

const isAdmin = computed(() => {
  const p = store.getters.permissions || [];
  return p.includes('*') || store.getters.isDepartmentLeader;
});
const isViewingSelf = computed(() => {
  const mid = store.getters.userId;
  if (isAdmin.value) return viewingMemberId.value === mid;
  return !viewingMemberId.value || viewingMemberId.value === mid;
});
const isViewingLeader = computed(() => {
  if (isViewingSelf.value || !viewingMemberId.value || !viewingMemberLeaderId.value) return false;
  return viewingMemberLeaderId.value === store.getters.userId;
});
const hasAnyDraft = computed(() => objectives.value.some(o => o.review_status === 'draft'));
const hasAnySubmitted = computed(() => objectives.value.some(o => o.review_status === 'submitted'));

const handleMemberSelect = (m) => {
  if (!m) return;
  viewingMemberId.value = m.id;
  viewingMemberName.value = m.name;
  viewingMemberLeaderId.value = m.leader_id || null;
  fetchObjectives();
};
const handlePeriodChange = () => { fetchObjectives(); fetchDashboard(); };

// ── 审核 ──
const handleSubmitForReview = async () => {
  if (!selectedPeriodId.value) return;
  ElMessageBox.confirm('提交后直属上级将收到审核通知，确定？', '提交审核', { confirmButtonText: '确定', type: 'info' })
    .then(async () => { await submitForReview(selectedPeriodId.value); ElMessage.success('已提交'); fetchObjectives(); }).catch(() => {});
};
const handleReview = async (obj, action) => {
  const t = action === 'approve' ? '通过' : '驳回';
  ElMessageBox.prompt('审核意见（可选）', `${t}审核`, { confirmButtonText: `确定${t}`, inputType: 'textarea' })
    .then(async ({ value: c }) => { await reviewObjective(obj.id, { action, comment: c || '' }); ElMessage.success(`已${t}`); fetchObjectives(); }).catch(() => {});
};
const handleUrgeMembers = async () => {
  ElMessageBox.confirm('将通知未提交成员的直属上级，确定？', '催促', { confirmButtonText: '确定', type: 'warning' })
    .then(async () => { const r = await urgeMembers(selectedPeriodId.value); ElMessage.success(`已通知 ${r.data.urged_count} 名`); }).catch(() => {});
};
const handleWithdrawReview = async (obj) => {
  ElMessageBox.confirm('撤回后目标将回到草稿状态，确定？', '撤回提交', { confirmButtonText: '确定', type: 'info' })
    .then(async () => { await withdrawReview(obj.id); ElMessage.success('已撤回'); fetchObjectives(); }).catch(() => {});
};

function reviewStatusLabel(s) {
  return { draft: '草稿', submitted: '待审核', approved: '已通过', rejected: '已驳回' }[s] || s;
}
function progressColor(p) {
  if (!p) return 'var(--text-placeholder)';
  if (p >= 70) return 'var(--el-color-success)';
  if (p >= 30) return 'var(--el-color-warning)';
  return 'var(--el-color-danger)';
}
function confidenceClass(c) {
  const v = c || 5;
  if (v >= 5) return 'conf-high';
  if (v >= 3) return 'conf-mid';
  return 'conf-low';
}

// ── 周期 ──
const periodDialogVisible = ref(false);
const handlePeriodSaved = async (f) => { await createPeriod(f); ElMessage.success('创建成功'); fetchPeriods(); };
const activePeriod = computed(() => periods.value.find(p => p.id === selectedPeriodId.value) || null);
const totalKRs = computed(() => objectives.value.reduce((s, o) => s + (o.key_results?.length || 0), 0));
const overallProgress = computed(() => {
  if (!objectives.value.length) return 0;
  return objectives.value.reduce((s, o) => s + (o.progress || 0), 0) / objectives.value.length;
});

// ── 弹窗 ──
const objectiveDialogVisible = ref(false);
const editingObjective = ref(null);
const handleAddObjective = () => { editingObjective.value = null; objectiveDialogVisible.value = true; };
const handleEditObjective = (o) => {
  if (o.review_status === 'submitted') {
    ElMessageBox.confirm('该目标已提交审核，编辑将自动撤回审核，确定继续？', '提示', { confirmButtonText: '确定', type: 'info' })
      .then(async () => {
        await withdrawReview(o.id);
        editingObjective.value = o;
        objectiveDialogVisible.value = true;
      }).catch(() => {});
  } else if (o.review_status === 'approved') {
    ElMessageBox.confirm('该目标已通过审核，编辑将撤销审核，确定继续？', '提示', { confirmButtonText: '确定', type: 'info' })
      .then(async () => {
        await withdrawReview(o.id);
        editingObjective.value = o;
        objectiveDialogVisible.value = true;
      }).catch(() => {});
  } else {
    editingObjective.value = o;
    objectiveDialogVisible.value = true;
  }
};
const handleObjectiveSaved = async (f) => {
  if (editingObjective.value) { await updateObjective(editingObjective.value.id, f); ElMessage.success('已更新'); }
  else { await createObjective({ ...f, period: selectedPeriodId.value }); ElMessage.success('已创建'); }
  fetchObjectives();
};
const handleDeleteObjective = (o) => {
  ElMessageBox.confirm(`删除「${o.title}」？`, '提示', { type: 'warning' })
    .then(async () => { await deleteObjective(o.id); ElMessage.success('已删除'); fetchObjectives(); }).catch(() => {});
};

const krDialogVisible = ref(false);
const editingKR = ref(null);
const currentObjective = ref(null);
const isLastKR = ref(false);
const handleAddKR = (o) => { currentObjective.value = o; editingKR.value = null; krDialogVisible.value = true; };
const handleEditKR = (k, o) => {
  if (o?.review_status === 'approved') {
    ElMessageBox.confirm('该目标已通过审核，编辑将撤销审核，确定继续？', '提示', { confirmButtonText: '确定', type: 'info' })
      .then(async () => {
        await withdrawReview(o.id);
        editingKR.value = k;
        isLastKR.value = o?.key_results?.length > 1 && k.id === o.key_results[o.key_results.length - 1].id;
        krDialogVisible.value = true;
      }).catch(() => {});
  } else {
    editingKR.value = k;
    isLastKR.value = o?.key_results?.length > 1 && k.id === o.key_results[o.key_results.length - 1].id;
    krDialogVisible.value = true;
  }
};
const handleDeleteKR = (k) => { ElMessageBox.confirm(`删除「${k.title}」？`, '提示', { type: 'warning' }).then(async () => { await deleteKR(k.id); ElMessage.success('已删除'); fetchObjectives(); }).catch(() => {}); };
const handleKRSaved = async (f) => {
  if (editingKR.value) { await updateKR(editingKR.value.id, f); ElMessage.success('已更新'); }
  else { await createKR({ ...f, objective: currentObjective.value.id }); ElMessage.success('已创建'); }
  fetchObjectives();
};

const progressDialogVisible = ref(false);
const progressKR = ref(null);
const handleUpdateProgress = (k) => { progressKR.value = k; progressDialogVisible.value = true; };
const handleProgressSaved = async ({ krId, value, note, confidence }) => { await updateKRProgress(krId, { value, note, confidence }); ElMessage.success('已更新'); fetchObjectives(); };

const fetchPeriods = async () => {
  const r = await getPeriodList({ pageSize: 999 });
  periods.value = r.data.list || [];
  if (!selectedPeriodId.value && periods.value.length) {
    const a = periods.value.find(p => p.status === '进行中');
    selectedPeriodId.value = a ? a.id : periods.value[0].id;
    fetchObjectives();
    fetchDashboard();
  }
};
const fetchObjectives = async () => {
  if (!selectedPeriodId.value) return;
  // 管理员未选中成员时不加载数据
  if (isAdmin.value && !viewingMemberId.value) {
    objectives.value = [];
    return;
  }
  loading.value = true;
  try {
    const p = { periodId: selectedPeriodId.value, pageSize: 999 };
    if (viewingMemberId.value) p.ownerId = viewingMemberId.value === store.getters.userId ? 'me' : viewingMemberId.value;
    const r = await getObjectiveList(p);
    objectives.value = r.data.list || [];
  } catch {} finally { loading.value = false; }
};
const fetchUsers = async () => {
  const r = await getUserList();
  userList.value = (r.data || []).map(u => ({ id: u.id, label: u.first_name || u.username, avatar: u.avatar || '', dept: u.dept || '' }));
};

const fetchDashboard = async () => {
  if (!isAdmin.value || !selectedPeriodId.value) return;
  try { const r = await getDashboard(selectedPeriodId.value); dashboardData.value = r.data; } catch { dashboardData.value = null; }
};

onMounted(() => { fetchUsers(); fetchPeriods(); });
</script>

<style scoped lang="scss">
/* ── Shell ── */
.okr-shell {
  padding: 20px 24px;
  background: var(--bg-page);
  min-height: 100%;
}

/* ── 数据看板 ── */
.dash-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.dash-tile {
  flex: 1;
  background: var(--bg-card);
  border-radius: 10px;
  padding: 14px 18px;
  text-align: center;
  box-shadow: var(--shadow-dropdown);
}
.dash-val {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;

  &.dash-c-not { color: var(--text-secondary); }
  &.dash-c-draft { color: var(--text-regular); }
  &.dash-c-sub { color: var(--el-color-primary); }
  &.dash-c-rej { color: var(--el-color-danger); }
  &.dash-c-ok { color: var(--el-color-success); }
}
.dash-lbl {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ── Command Bar ── */
.command-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;

  &__context {
    display: flex;
    align-items: center;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
.context-period {
  display: flex;
  align-items: center;
  gap: 12px;

  &__range {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
}
.period-select {
  width: 180px;
}

/* ── Body ── */
.okr-body {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.okr-content {
  flex: 1;
  min-width: 0;
}

/* ── Who Banner ── */
.who-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  margin-bottom: 16px;
  background: var(--el-color-primary-light-9);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-regular);

  &__label { color: var(--text-secondary); }
  &__name { color: var(--el-color-primary); font-weight: 600; }
  &__suffix { color: var(--text-regular); }
  &__badge {
    margin-left: auto;
    font-size: 11px;
    background: var(--el-color-primary);
    color: #fff;
    padding: 1px 10px;
    border-radius: 10px;
    font-weight: 500;
  }
}

/* ── Stats Dashboard ── */
.stats-dash {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.stat-tile {
  position: relative;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: var(--shadow-dropdown);

  &__value {
    display: block;
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
    small { font-size: 14px; font-weight: 500; }
  }
  &__label {
    display: block;
    font-size: 12px;
    color: var(--text-regular);
    margin-top: 2px;
  }
  &__ring {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    svg { width:100%; height:100% }
  }
}

/* ── Empty ── */
.empty-place {
  text-align: center;
  padding: 72px 20px;
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: var(--shadow-dropdown);

  &__icon { font-size: 36px; color: var(--text-secondary); margin-bottom: 12px; }
  &__title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 6px; }
  &__desc { font-size: 13px; color: var(--text-secondary); margin: 0; }
}

.objective-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── O Card ── */
.o-card {
  position: relative;
  background: var(--bg-card);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-dropdown);
  transition: box-shadow .25s ease, transform .2s ease;

  &:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-1px);
  }

  &__glow {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 14px 14px 0 0;
  }
  &--draft    .o-card__glow { background: var(--text-secondary); }
  &--submitted .o-card__glow { background: linear-gradient(90deg, var(--el-color-primary), var(--el-color-primary-light-5)); }
  &--approved  .o-card__glow { background: linear-gradient(90deg, var(--el-color-success), var(--el-color-success-light-5)); }
  &--rejected  .o-card__glow { background: linear-gradient(90deg, var(--el-color-danger), var(--el-color-danger-light-5)); }

  &__body {
    padding: 20px 22px;
  }
}

.o-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  &-main {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }
  &-side {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
}

.o-card__badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
  white-space: nowrap;

  &.badge-draft     { background: var(--bg-elevated); color: var(--text-regular); }
  &.badge-submitted { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.badge-approved  { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.badge-rejected  { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
}

.o-card__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 序号圆 ── */
.align-seq {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-inverse);
  background: var(--el-color-primary);
  flex-shrink: 0;
  line-height: 1;
}

/* ── 对齐标签 ── */
.align-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;

  &--parent {
    background: var(--el-color-info-light-9);
    color: var(--el-color-info);
  }

  &--child {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.o-card__mentions {
  margin-left: 6px;
}

.card-ops {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity .18s;
}
.o-card__head:hover .card-ops { opacity: 1; }
.review-actions { display: flex; gap: 2px; margin-right: 4px; }

/* ── Feedback ── */
.feedback-bar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  background: var(--bg-elevated);

  &__icon {
    flex-shrink: 0;
    font-size: 16px;
    margin-top: 1px;
    color: var(--text-regular);
  }
  &__text { flex: 1; color: var(--text-primary); line-height: 1.5; }
  &__author { color: var(--text-secondary); font-size: 12px; white-space: nowrap; flex-shrink: 0; }

  &--approved {
    background: var(--el-color-success-light-9);
    .feedback-bar__icon { color: var(--el-color-success); }
    .feedback-bar__text { color: var(--el-color-success-dark-2); }
  }
  &--rejected {
    background: var(--el-color-danger-light-9);
    border: 1px solid var(--el-color-danger-light-7);
    .feedback-bar__icon { color: var(--el-color-danger); }
    .feedback-bar__text { color: var(--el-color-danger-dark-2); font-weight: 500; }
  }
}

/* ── Progress ── */
.o-card__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.progress-track {
  flex: 1;
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width .4s ease;
}
.progress-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 40px;
  text-align: right;
}

/* ── KR ── */
.kr-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kr-row {
  padding: 10px 14px;
  background: var(--bg-elevated);
  border-radius: 10px;
  transition: background .15s;

  &--done { background: var(--el-color-success-light-9); }

  &__main {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  &__check { color: var(--el-color-success); font-size: 13px; flex-shrink: 0; }
  &__title {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &__pct { font-size: 12px; font-weight: 700; }
  &__bar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  &__range { font-size: 11px; color: var(--text-secondary); min-width: 36px; }
  &__ops {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity .15s;
    margin-left: auto;
  }
  &:hover &__ops { opacity: 1; }
}
.kr-minibar {
  flex: 1;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}
.kr-minibar__fill {
  height: 100%;
  border-radius: 2px;
  transition: width .3s ease;
}
.kr-addon {
  padding: 6px 0 0;
}

/* ── 信心指数 ── */
.kr-row__confidence {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 2px;
  &.conf-high { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.conf-mid  { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.conf-low  { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
}

/* ── @ 成员头像 ── */
.kr-row__mentions {
  margin-left: 4px;
  display: inline-flex;
  align-items: center;
}
.mention-avatars {
  display: inline-flex;
  align-items: center;
}
.mention-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--bg-card);
  margin-left: -4px;
  flex-shrink: 0;
  background: var(--bg-elevated);
  &:first-child { margin-left: 0; }
}
.mention-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #667eea, #764ba2);
}
.mention-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1.5px solid var(--bg-card);
  margin-left: -4px;
}
</style>
