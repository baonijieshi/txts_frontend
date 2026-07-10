<template>
  <div class="version-page">
    <!-- ═══ 毛玻璃工具栏 ═══ -->
    <div class="toolbar-glass">
      <div class="toolbar-left">
        <h2 class="page-title">版本管理</h2>
        <span class="page-count">{{ totalVersionCount }} 个版本</span>
        <el-input
          v-model="queryParams.name"
          placeholder="搜索版本名称..."
          clearable
          :prefix-icon="Search"
          class="toolbar-search"
          @input="debounceFetch"
          @clear="handleSearch"
        />
      </div>
      <div class="toolbar-right">
        <UserCascader v-model="queryParams.manager" :user-list="pmUserList" value-key="label" placeholder="产品经理" width="140px" @change="handleSearch" />
        <UserCascader v-if="viewMode !== 'kanban'" v-model="queryParams.testLeader" :user-list="testUserList" value-key="label" placeholder="测试负责人" width="140px" @change="handleSearch" />
        <el-segmented v-model="viewMode" :options="viewOptions" size="default" />
        <el-button type="primary" :icon="Plus" @click="handleAdd">新建版本</el-button>
      </div>
    </div>

    <!-- ═══ 活跃筛选芯片 ═══ -->
    <div v-if="activeFilterCount > 0" class="active-filters">
      <span
        v-if="queryParams.name"
        class="filter-chip"
        @click="queryParams.name = ''; handleSearch()"
      >搜索: {{ queryParams.name }} <el-icon><Close /></el-icon></span>
      <span
        v-if="queryParams.manager"
        class="filter-chip"
        @click="queryParams.manager = null; handleSearch()"
      >PM <el-icon><Close /></el-icon></span>
      <span
        v-if="queryParams.testLeader"
        class="filter-chip"
        @click="queryParams.testLeader = null; handleSearch()"
      >QA <el-icon><Close /></el-icon></span>
      <el-button link type="primary" class="filter-clear" @click="handleReset">清除筛选</el-button>
    </div>

    <!-- ═══ 看板视图 ═══ -->
    <template v-if="viewMode === 'kanban'">
      <div v-loading="loading" class="kanban-board">
        <div
          v-for="col in columns"
          :key="col.key"
          class="kanban-column"
          :class="{ 'is-over': dragOverColumn === col.key }"
          @dragover.prevent="onDragOver($event, col.key)"
          @dragleave="onDragLeave(col.key)"
          @drop="onDrop($event, col.key)"
        >
          <!-- 列头 -->
          <div class="column-header">
            <div class="column-header__left">
              <span class="column-dot" :style="{ background: col.color }" />
              <span class="column-label">{{ col.label }}</span>
              <span class="column-count">{{ groupedVersions[col.key]?.length || 0 }}</span>
            </div>
            <el-button
              v-if="col.key !== '已归档'"
              size="small"
              :icon="Plus"
              link
              class="column-add-btn"
              @click="handleAddToStatus(col.key)"
            />
            <el-button
              v-else
              size="small"
              :icon="FolderOpened"
              link
              class="column-archive-btn"
              @click="archiveDialogVisible = true"
            >归档仓库</el-button>
          </div>

          <!-- 卡片列表 -->
          <div class="column-body">
            <TransitionGroup name="card">
              <VersionCard
                v-for="ver in (groupedVersions[col.key] || [])"
                :key="ver.id"
                :version="ver"
                class="kanban-card-item"
                @click="handleDetail(ver)"
                @edit="handleEdit(ver)"
                @delete="handleDelete(ver)"
                @archive="handleArchive(ver)"
                @go-bug="goToBugPage(ver)"
                @submit-test="handleSubmitTest(ver)"
                @pass-test="handlePassTest(ver)"
                @reject-test="handleRejectTest(ver)"
                @submit-acceptance="handleSubmitAcceptance(ver)"
                @pass-acceptance="handlePassAcceptance(ver)"
                @reject-acceptance="handleRejectAcceptance(ver)"
              />
            </TransitionGroup>

            <div v-if="!groupedVersions[col.key]?.length" class="column-empty">
              拖拽版本到此处
            </div>
          </div>
        </div>
      </div>

      <!-- 看板空状态 -->
      <div v-if="!loading && allVersions.length === 0" class="empty-state">
        <el-empty :image-size="120" description="">
          <template #description>
            <p class="empty-title">{{ hasFilter ? '没有匹配的版本' : '还没有版本' }}</p>
            <p class="empty-desc">{{ hasFilter ? '试试调整筛选条件' : '创建第一个版本来开始管理迭代' }}</p>
          </template>
          <el-button v-if="!hasFilter" type="primary" @click="handleAdd">新建版本</el-button>
          <el-button v-else @click="handleReset">清除筛选</el-button>
        </el-empty>
      </div>
    </template>

    <!-- ═══ 人员视图（保留原有逻辑）═══ -->
    <template v-if="viewMode === 'person'">
      <div v-if="personGroups.length > 0" v-loading="loading" class="person-board">
        <div v-for="pg in personGroups" :key="pg.id ?? 'unassigned'" class="person-group">
          <div
            class="person-group__header"
            role="button"
            tabindex="0"
            :aria-expanded="expandedPersons.has(pg.id)"
            @click="togglePerson(pg)"
            @keydown.enter="togglePerson(pg)"
          >
            <el-icon class="collapse-icon" :class="{ 'is-open': expandedPersons.has(pg.id) }"><ArrowRight /></el-icon>
            <div class="person-avatars">
              <el-avatar v-for="(av, idx) in (pg.avatars || [pg.avatar])" :key="idx" :size="28" :src="av || ''">{{ ((pg.names || [pg.name])[idx] || '?').charAt(0) }}</el-avatar>
            </div>
            <span class="person-group__label">{{ pg.name }}</span>
            <el-badge :value="pg.count" :max="999" class="person-group__badge" />
          </div>
          <el-collapse-transition>
            <div v-show="expandedPersons.has(pg.id)" class="person-versions">
              <div v-if="personLoading[pg.id]" v-loading="true" style="height: 80px" />
              <template v-else>
                <VersionCard
                  v-for="ver in (personVersions[pg.id] || [])"
                  :key="ver.id"
                  :version="ver"
                  :draggable="false"
                  class="person-card-item"
                  @click="handleDetail(ver)"
                  @edit="handleEdit(ver)"
                  @delete="handleDelete(ver)"
                  @archive="handleArchive(ver)"
                  @go-bug="goToBugPage(ver)"
                  @submit-test="handleSubmitTest(ver)"
                  @pass-test="handlePassTest(ver)"
                  @reject-test="handleRejectTest(ver)"
                  @submit-acceptance="handleSubmitAcceptance(ver)"
                  @pass-acceptance="handlePassAcceptance(ver)"
                  @reject-acceptance="handleRejectAcceptance(ver)"
                />
                <div v-if="(personTotals[pg.id] || 0) > PAGE_SIZE" class="lazy-pagination">
                  <el-pagination
                    :current-page="personPages[pg.id] || 1"
                    :page-size="PAGE_SIZE"
                    :total="personTotals[pg.id] || 0"
                    layout="prev, pager, next"
                    small
                    background
                    @current-change="(p) => handlePersonPage(pg, p)"
                  />
                </div>
              </template>
            </div>
          </el-collapse-transition>
        </div>
      </div>
      <div v-else-if="!loading" class="empty-state">
        <el-empty :image-size="120" description="">
          <template #description>
            <p class="empty-title">{{ hasFilter ? '没有匹配的版本' : '还没有版本' }}</p>
            <p class="empty-desc">{{ hasFilter ? '试试调整筛选条件' : '创建第一个版本来开始管理迭代' }}</p>
          </template>
          <el-button v-if="!hasFilter" type="primary" @click="handleAdd">新建版本</el-button>
          <el-button v-else @click="handleReset">清除筛选</el-button>
        </el-empty>
      </div>
    </template>

    <!-- ═══ 弹窗 ═══ -->
    <VersionDialog
      v-model:visible="dialogVisible"
      :editing-id="editingId"
      :initial-form="editingForm"
      :story-options="storyOptions"
      :project-options="projectOptions"
      :pm-user-list="pmUserList"
      :dev-user-list="devUserList"
      :test-user-list="testUserList"
      @saved="handleSaved"
    />
    <VersionDetailDialog
      v-model:visible="detailVisible"
      :version="detailVersion"
      @refresh-list="handleRefreshFromDetail"
      @edit="handleEdit"
    />
    <VersionArchiveDialog v-model:visible="archiveDialogVisible" @refresh="handleSearch" />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, reactive, computed, watch, onMounted, nextTick,
} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus, Search, ArrowRight, Close, FolderOpened,
} from '@element-plus/icons-vue';
import {
  getVersionList,
  getVersionPersonGrouped,
  getVersionByPerson,
  updateVersion,
  deleteVersion,
  archiveVersion,
  submitTest,
  passTest,
  rejectTest,
  submitAcceptance,
  passAcceptance,
  rejectAcceptance,
} from '@/api/version';
import { getUserList } from '@/api/user';
import { getStoryList } from '@/api/story';
import { getProjectList } from '@/api/project';
import UserCascader from '@/components/UserCascader.vue';
import VersionCard from './components/VersionCard.vue';
import VersionDialog from './components/VersionDialog.vue';
import VersionDetailDialog from './components/VersionDetailDialog.vue';
import VersionArchiveDialog from './components/VersionArchiveDialog.vue';

const router = useRouter();
const route = useRoute();
const PAGE_SIZE = 20;

// ── 看板列定义 ──
const columns = [
  { key: '未开始', label: '未开始', color: 'var(--text-secondary)' },
  { key: '进行中', label: '进行中', color: 'var(--el-color-primary)' },
  { key: '已完成', label: '已完成', color: 'var(--el-color-success)' },
  { key: '已暂停', label: '已暂停', color: 'var(--el-color-warning)' },
  { key: '已归档', label: '已归档', color: 'var(--text-placeholder)' },
];

// ── 视图模式 ──
const viewMode = ref('kanban');
const viewOptions = [
  { label: '看板', value: 'kanban' },
  { label: '人员', value: 'person' },
];

// ── 筛选 ──
const queryParams = reactive({
  name: '', status: '', manager: null, testLeader: null,
});
const activeFilterCount = computed(() => {
  let c = 0;
  if (queryParams.name) c++;
  if (queryParams.manager) c++;
  if (queryParams.testLeader) c++;
  return c;
});
const hasFilter = computed(
  () => queryParams.name || queryParams.manager || queryParams.testLeader,
);

const filterParams = computed(() => {
  const p = {};
  if (queryParams.name) p.name = queryParams.name;
  if (queryParams.manager) p.manager = queryParams.manager;
  if (queryParams.testLeader) p.testLeader = queryParams.testLeader;
  return p;
});

// ── 基础数据 ──
const pmUserList = ref([]);
const devUserList = ref([]);
const testUserList = ref([]);
const storyOptions = ref([]);
const projectOptions = ref([]);
const loading = ref(false);
const totalVersionCount = ref(0);

const mapUser = (u) => ({
  id: u.id, label: u.first_name || u.username, avatar: u.avatar || '', dept: u.dept || '',
});

const mapVersion = (v) => ({
  id: v.id,
  name: v.name,
  status: v.status,
  progress: v.progress || 0,
  startDate: v.start_date,
  endDate: v.end_date,
  manager: v.manager_name,
  managerAvatar: v.manager_avatar,
  devLeader: v.dev_leader_name,
  devLeaderAvatar: v.dev_leader_avatar,
  testLeader: (v.test_leader_names || []).join('、'),
  testLeaderAvatar: (v.test_leader_avatars || [])[0] || '',
  testLeaderNames: v.test_leader_names || [],
  testLeaderAvatars: v.test_leader_avatars || [],
  testLeaderIds: v.test_leader_ids || [],
  storyTitle: v.story_title,
  projectNames: v.project_names || [],
  projectIds: v.project_ids || [],
  taskTotal: v.task_total || 0,
  taskDone: v.task_done || 0,
  devProgress: v.dev_task_progress || 0,
  acceptanceTaskProgress: v.acceptance_task_progress || 0,
  bugCount: v.bug_count || 0,
  desc: v.description || '',
  story: v.story,
  managerId: v.manager,
  devLeaderId: v.dev_leader,
  isArchived: v.is_archived || false,
  test_status: v.test_status || '未提测',
  acceptance_status: v.acceptance_status || '待验收',
  acceptance_comment: v.acceptance_comment || '',
  planCaseTotal: v.plan_case_total || 0,
  planCaseExecuted: v.plan_case_executed || 0,
});

// ── 看板视图：后端筛选 + 前端分组 ──
const allVersions = ref([]);
const groupedVersions = computed(() => {
  // 后端已处理筛选，前端仅按状态分组
  const groups = {};
  columns.forEach((c) => { groups[c.key] = []; });
  allVersions.value.forEach((v) => {
    if (groups[v.status]) groups[v.status].push(v);
  });
  return groups;
});

const fetchKanbanVersions = async () => {
  loading.value = true;
  try {
    const params: Record<string, unknown> = { page: 1, pageSize: 999 };
    if (queryParams.name) params.name = queryParams.name;
    if (queryParams.manager) params.manager = queryParams.manager;
    const res = await getVersionList(params);
    allVersions.value = (res.data.list || []).map(mapVersion);
    totalVersionCount.value = res.data.total || allVersions.value.length;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
};

// ── 拖拽逻辑 ──
const dragOverColumn = ref(null);

const onDragOver = (_e: DragEvent, colKey: string) => {
  dragOverColumn.value = colKey;
};

const onDragLeave = (colKey: string) => {
  if (dragOverColumn.value === colKey) {
    dragOverColumn.value = null;
  }
};

const onDrop = async (e: DragEvent, targetStatus: string) => {
  dragOverColumn.value = null;
  const versionId = Number(e.dataTransfer?.getData('text/plain'));
  if (!versionId) return;

  const ver = allVersions.value.find((v) => v.id === versionId);
  if (!ver || ver.status === targetStatus) return;

  // 已归档走独立 API
  if (targetStatus === '已归档') {
    try {
      await archiveVersion(versionId);
      ElMessage.success('版本已归档');
      await fetchKanbanVersions();
    } catch { /* ignore */ }
    return;
  }

  // 乐观更新
  const oldStatus = ver.status;
  ver.status = targetStatus;

  try {
    await updateVersion(versionId, { status: targetStatus });
    ElMessage.success(`已移至「${targetStatus}」`);
  } catch {
    // 回滚
    ver.status = oldStatus;
  }
};

// ── 人员视图（保留原有逻辑）──
const personGroups = ref([]);
const expandedPersons = reactive(new Set());
const personVersions = reactive({});
const personTotals = reactive({});
const personPages = reactive({});
const personLoading = reactive({});

const fetchPersonGrouped = async () => {
  loading.value = true;
  try {
    const res = await getVersionPersonGrouped(filterParams.value);
    personGroups.value = res.data.persons || [];
    totalVersionCount.value = res.data.total || 0;
    if (personGroups.value.length > 0) {
      const first = personGroups.value[0];
      expandedPersons.add(first.id);
      const vids = first.version_ids ? first.version_ids.join(',') : null;
      fetchPersonVersions(first.id, 1, vids);
    }
  } finally { loading.value = false; }
};

const fetchPersonVersions = async (personId, page = 1, versionIds = null) => {
  personLoading[personId] = true;
  try {
    const params = {
      ...filterParams.value, personId: personId ?? 'null', page, pageSize: PAGE_SIZE,
    };
    if (versionIds) params.versionIds = versionIds;
    const res = await getVersionByPerson(params);
    personVersions[personId] = (res.data.list || []).map(mapVersion);
    personTotals[personId] = res.data.total || 0;
    personPages[personId] = page;
  } finally { personLoading[personId] = false; }
};

const togglePerson = (pg) => {
  const key = pg.id;
  if (expandedPersons.has(key)) { expandedPersons.delete(key); return; }
  expandedPersons.add(key);
  if (!personVersions[key]) {
    const vids = pg.version_ids ? pg.version_ids.join(',') : null;
    fetchPersonVersions(pg.id, 1, vids);
  }
};
const handlePersonPage = (pg, page) => {
  const vids = pg.version_ids ? pg.version_ids.join(',') : null;
  fetchPersonVersions(pg.id, page, vids);
};

// ── 搜索 & 重置 ──
let debounceTimer = null;
const debounceFetch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => handleSearch(), 300);
};

const clearPersonCaches = () => {
  expandedPersons.clear();
  Object.keys(personVersions).forEach((k) => { delete personVersions[k]; });
  Object.keys(personTotals).forEach((k) => { delete personTotals[k]; });
  Object.keys(personPages).forEach((k) => { delete personPages[k]; });
};

const handleSearch = () => {
  if (viewMode.value === 'kanban') {
    // 看板模式下筛选是前端计算，不需要重新请求
    // 除非需要服务端筛选（目前用 getVersionList 全量拉取）
    fetchKanbanVersions();
  } else {
    clearPersonCaches();
    fetchPersonGrouped();
  }
};

const handleReset = () => {
  queryParams.name = '';
  queryParams.status = '';
  queryParams.manager = null;
  queryParams.testLeader = null;
  handleSearch();
};

watch(viewMode, (val) => {
  if (val === 'kanban') {
    fetchKanbanVersions();
  } else {
    clearPersonCaches();
    fetchPersonGrouped();
  }
});

// ── 版本 CRUD ──
const dialogVisible = ref(false);
const editingId = ref(null);
const editingForm = ref(null);

const handleAdd = () => { editingId.value = null; editingForm.value = null; dialogVisible.value = true; };

const handleAddToStatus = (status: string) => {
  editingId.value = null;
  editingForm.value = { status };
  dialogVisible.value = true;
};

const handleEdit = (ver) => {
  editingId.value = ver.id;
  editingForm.value = {
    name: ver.name,
    story: ver.story || null,
    projectIds: ver.projectIds || [],
    manager: ver.managerId || null,
    devLeader: ver.devLeaderId || null,
    testLeader: ver.testLeaderIds?.[0] ?? null,
    status: ver.status,
    startDate: ver.startDate || '',
    endDate: ver.endDate || '',
    desc: ver.desc || '',
  };
  dialogVisible.value = true;
};
const handleDelete = (ver) => {
  ElMessageBox.confirm(`确定删除版本「${ver.name}」？此操作不可恢复。`, '提示', { type: 'warning' })
    .then(async () => { await deleteVersion(ver.id); ElMessage.success('已删除'); handleSearch(); })
    .catch(() => {});
};
const handleArchive = async (ver) => {
  try {
    const res = await archiveVersion(ver.id);
    ElMessage.success(res.message || '操作成功');
    handleSearch();
  } catch { /* ignore */ }
};
const handleSaved = () => handleSearch();

// ── 详情 ──
const detailVisible = ref(false);
const detailVersion = ref(null);
const archiveDialogVisible = ref(false);
const handleDetail = (ver) => { detailVersion.value = ver; detailVisible.value = true; };
const handleRefreshFromDetail = () => handleSearch();

const goToBugPage = (ver) => {
  router.push({ path: '/test/bug', query: { versionId: ver.id, versionName: ver.name } });
};

// ── 提测流程 ──
const handleSubmitTest = async (ver) => {
  try {
    await ElMessageBox.prompt('测试说明（可选）', '确认提测', {
      confirmButtonText: '提测',
      inputPlaceholder: '给QA的备注信息...',
      inputType: 'textarea',
    }).then(async ({ value }) => {
      await submitTest(ver.id, value || '');
      ElMessage.success('已提测，QA将收到通知');
      handleSearch();
    }).catch(() => {});
  } catch { /* cancel */ }
};
const handlePassTest = async (ver) => {
  try {
    await ElMessageBox.confirm(`确定「${ver.name}」测试通过？`, '确认', { type: 'success' });
    await passTest(ver.id);
    ElMessage.success('测试通过');
    handleSearch();
  } catch { /* cancel */ }
};
const handleRejectTest = async (ver) => {
  try {
    await ElMessageBox.prompt('驳回原因', '测试驳回', {
      confirmButtonText: '驳回',
      inputPlaceholder: '描述发现的问题...',
      inputType: 'textarea',
    }).then(async ({ value }) => {
      await rejectTest(ver.id, value || '');
      ElMessage.success('已驳回');
      handleSearch();
    }).catch(() => {});
  } catch { /* cancel */ }
};

// ── 验收操作 ──
const handleSubmitAcceptance = async (ver) => {
  try {
    await ElMessageBox.confirm(`确定将「${ver.name}」提交产品验收？`, '确认', { type: 'primary' });
    await submitAcceptance(ver.id);
    ElMessage.success('已提交验收，产品将收到通知');
    handleSearch();
  } catch { /* cancel */ }
};
const handlePassAcceptance = async (ver) => {
  try {
    await ElMessageBox.confirm(`确定「${ver.name}」验收通过？`, '确认', { type: 'success' });
    await passAcceptance(ver.id);
    ElMessage.success('验收通过，版本已完成');
    handleSearch();
  } catch { /* cancel */ }
};
const handleRejectAcceptance = async (ver) => {
  try {
    await ElMessageBox.prompt('驳回原因', '验收驳回', {
      confirmButtonText: '驳回',
      inputPlaceholder: '描述需要改进的问题...',
      inputType: 'textarea',
    }).then(async ({ value }) => {
      await rejectAcceptance(ver.id, value || '');
      ElMessage.success('已驳回');
      handleSearch();
    }).catch(() => {});
  } catch { /* cancel */ }
};

// ── 初始化 ──
onMounted(async () => {
  fetchKanbanVersions();
  try {
    const [userRes, storyRes, projectRes] = await Promise.all([
      getUserList(), getStoryList({ page: 1, pageSize: 999 }), getProjectList({ page: 1, pageSize: 999 }),
    ]);
    const users = (userRes.data || []).map(mapUser);
    pmUserList.value = users; devUserList.value = users; testUserList.value = users;
    storyOptions.value = storyRes.data?.list || storyRes.data || [];
    projectOptions.value = projectRes.data?.list || projectRes.data || [];
  } catch { /* ignore */ }
  // 支持从需求页跳转
  const { storyId, storyTitle, versionId } = route.query;
  if (storyId && storyTitle) {
    editingForm.value = {
      name: storyTitle,
      story: Number(storyId),
      manager: null,
      devLeader: null,
      testLeader: [],
      status: '未开始',
      startDate: '',
      endDate: '',
      desc: '',
    };
    dialogVisible.value = true;
    router.replace({ path: route.path });
  } else if (versionId) {
    const vid = Number(versionId);
    nextTick(() => {
      const found = allVersions.value.find((v) => v.id === vid);
      if (found) { handleDetail(found); router.replace({ path: route.path }); return; }
      import('@/api/version').then(({ getVersionDetail }) => {
        getVersionDetail(vid, { tab: 'task' }).then((res) => {
          const v = res.data?.version;
          if (v) { handleDetail(mapVersion(v)); }
        });
      });
      router.replace({ path: route.path });
    });
  }
});
</script>

<style scoped lang="scss">
/* ══════════════════════════════════════════════
   版本管理 — 看板视图
   设计语言：全幅无边界 / 玻璃态 / 微动效
   ══════════════════════════════════════════════ */

.version-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

/* ── 毛玻璃工具栏 ── */
.toolbar-glass {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--bg-card);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--border-light);
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 19px;
  font-weight: 650;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.3px;
}

.page-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.toolbar-search {
  width: 200px;
}

/* ── 活跃筛选芯片 ── */
.active-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-hover);
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.filter-clear {
  font-size: 12px;
}

/* ═══ 看板面板 ═══ */
.kanban-board {
  flex: 1;
  display: flex;
  gap: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 24px 24px;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }
}

/* ── 看板列 ── */
.kanban-column {
  flex: 1;
  min-width: 300px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  transition: background 0.2s;

  &.is-over {
    background: var(--el-color-primary-light-9);
  }
}

/* ── 列头（玻璃态）── */
.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-light);

  &__left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.column-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.column-count {
  font-size: 12px;
  color: var(--text-placeholder);
  background: var(--bg-hover);
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: 500;
}

.column-add-btn {
  opacity: 0;
  transition: opacity 0.15s;
}

.column-archive-btn {
  font-size: 12px;
  color: var(--text-placeholder);
  transition: color 0.15s;

  &:hover {
    color: var(--text-secondary);
  }

  .el-icon {
    font-size: 13px;
    margin-right: 2px;
  }
}

.column-header:hover .column-add-btn {
  opacity: 1;
}

/* ── 列内容 ── */
.column-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar { width: 0; }
}

.column-empty {
  padding: 32px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-placeholder);
  border: 2px dashed var(--border-light);
  border-radius: 10px;
  margin: 8px 0;
}

/* ── 卡片动画 ── */
.card-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-leave-active {
  transition: all 0.2s ease-in;
  position: absolute;
}

.card-enter-from {
  opacity: 0;
  transform: translateY(-16px) scale(0.95);
}

.card-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}

.card-move {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ═══ 人员视图 ═══ */
.person-board {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 20px;
}

.person-group {
  margin-bottom: 8px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
    &:hover { background: var(--bg-hover); }
  }

  &__label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
  }

  &__badge {
    :deep(.el-badge__content) {
      position: static;
      transform: none;
      font-size: 11px;
      height: 18px;
      line-height: 18px;
      padding: 0 6px;
      background: var(--bg-hover);
      color: var(--text-secondary);
      border: none;
      font-weight: 600;
    }
  }
}

.person-avatars {
  display: flex;
  gap: 2px;
  .el-avatar {
    background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
    color: var(--text-inverse);
    font-size: 11px;
  }
}

.person-versions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 10px;
  padding: 8px 12px 12px;
}

.collapse-icon {
  font-size: 14px;
  color: var(--text-secondary);
  transition: transform 0.2s;
  &.is-open { transform: rotate(90deg); }
}

/* ── 空状态 ── */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
.empty-title { font-size: 15px; color: var(--text-regular); margin: 0 0 4px; }
.empty-desc { font-size: 13px; color: var(--text-secondary); margin: 0; }
.lazy-pagination { display: flex; justify-content: center; padding: 8px 0; }
</style>
