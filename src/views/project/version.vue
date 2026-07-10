<template>
  <div class="version-page">
    <!-- 顶部工具栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">版本管理</h2>
        <span class="page-subtitle">{{ versions.length }} 个版本</span>
      </div>
      <div style="display:flex;gap:10px">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新建版本</el-button>
        <el-button :icon="FolderOpened" @click="archiveDialogVisible = true">归档仓库</el-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="queryParams.name"
        placeholder="搜索版本名称"
        clearable
        :prefix-icon="Search"
        style="width: 220px"
        @input="handleSearch"
        @clear="handleSearch"
      />
      <el-select
        v-model="queryParams.status"
        placeholder="全部状态"
        clearable
        style="width: 130px"
        @change="handleSearch"
      >
        <el-option label="未开始" value="未开始" />
        <el-option label="进行中" value="进行中" />
        <el-option label="已完成" value="已完成" />
        <el-option label="已暂停" value="已暂停" />
      </el-select>
      <el-select
        v-model="queryParams.manager"
        placeholder="产品经理"
        clearable
        filterable
        style="width: 150px"
        @change="handleSearch"
      >
        <el-option v-for="u in pmUserList" :key="u.id" :label="u.label" :value="u.label">
          <div class="user-option">
            <el-avatar :size="20" :src="u.avatar || ''">{{ u.label ? u.label.charAt(0) : '' }}</el-avatar>
            <span>{{ u.label }}</span>
          </div>
        </el-option>
      </el-select>
      <el-button
        v-if="queryParams.name || queryParams.status || queryParams.manager"
        link
        type="primary"
        @click="handleReset"
      >清除筛选</el-button>
    </div>

    <!-- 时间轴内容 -->
    <div v-if="groupedVersions.length > 0" v-loading="loading" class="version-grouped">
      <div v-for="yearGroup in groupedVersions" :key="yearGroup.year" class="year-group">
        <div
          class="year-group__header"
          role="button"
          tabindex="0"
          :aria-expanded="expandedYears.has(yearGroup.year)"
          @click="toggleYear(yearGroup.year)"
          @keydown.enter="toggleYear(yearGroup.year)"
        >
          <el-icon class="collapse-icon" :class="{ 'is-open': expandedYears.has(yearGroup.year) }">
            <ArrowRight />
          </el-icon>
          <span class="year-group__label">{{ yearGroup.year }} 年</span>
          <el-badge :value="yearGroup.total" :max="999" class="year-group__badge" />
        </div>

        <el-collapse-transition>
          <div v-show="expandedYears.has(yearGroup.year)" class="quarter-list">
            <div v-for="qg in yearGroup.quarters" :key="qg.quarter" class="quarter-group">
              <div
                class="quarter-group__header"
                role="button"
                tabindex="0"
                :aria-expanded="expandedQuarters.has(`${yearGroup.year}-${qg.quarter}`)"
                @click="toggleQuarter(yearGroup.year, qg.quarter)"
                @keydown.enter="toggleQuarter(yearGroup.year, qg.quarter)"
              >
                <el-icon class="collapse-icon collapse-icon--sm" :class="{ 'is-open': expandedQuarters.has(`${yearGroup.year}-${qg.quarter}`) }">
                  <ArrowRight />
                </el-icon>
                <span class="quarter-group__label">{{ qg.quarter }}</span>
                <span class="quarter-group__count">{{ qg.versions.length }} 个版本</span>
              </div>

              <el-collapse-transition>
                <div v-show="expandedQuarters.has(`${yearGroup.year}-${qg.quarter}`)" class="version-timeline">
                  <div v-for="ver in qg.versions" :key="ver.id" class="version-card">
                    <div class="version-card__dot" :class="statusDotClass(ver.status)" />
                    <div class="version-card__body" @click="handleDetail(ver)">
                      <!-- 第一行：标题 + 操作 -->
                      <div class="version-card__row-1">
                        <div class="version-card__title-area">
                          <span class="version-card__name">{{ ver.name }}</span>
                          <el-tag :type="statusType(ver.status)" size="small" effect="plain" round>{{ ver.status }}</el-tag>
                        </div>
                        <div class="version-card__actions" @click.stop>
                          <el-button v-if="canVerSubmit(ver)" size="small" link type="warning" @click="handleSubmitTest(ver)">提测</el-button>
                          <el-button v-if="ver.test_status === '测试中'" size="small" link type="success" @click="handlePassTest(ver)">通过</el-button>
                          <el-button v-if="ver.test_status === '测试中'" size="small" link type="danger" @click="handleRejectTest(ver)">驳回</el-button>
                          <el-button size="small" link type="primary" @click="handleEdit(ver)">编辑</el-button>
                          <el-button size="small" link type="danger" @click="handleDelete(ver)">删除</el-button>
                        </div>
                      </div>

                      <!-- 第二行：周期 + 需求 -->
                      <div class="version-card__row-2">
                        <span v-if="ver.startDate || ver.endDate" class="meta-chip">
                          <el-icon><Calendar /></el-icon>
                          {{ ver.startDate || '?' }} ~ {{ ver.endDate || '?' }}
                        </span>
                        <span v-if="ver.storyTitle" class="meta-chip meta-chip--story">
                          <el-icon><Document /></el-icon>
                          {{ ver.storyTitle }}
                        </span>
                      </div>

                      <!-- 第三行：团队 -->
                      <div v-if="ver.manager || ver.devLeader || ver.testLeader" class="version-card__row-3">
                        <div v-if="ver.manager" class="member-chip">
                          <el-avatar :size="18" :src="ver.managerAvatar || ''">{{ ver.manager.charAt(0) }}</el-avatar>
                          <span class="member-chip__role">PM</span>
                          <span class="member-chip__name">{{ ver.manager }}</span>
                        </div>
                        <div v-if="ver.devLeader" class="member-chip">
                          <el-avatar :size="18" :src="ver.devLeaderAvatar || ''">{{ ver.devLeader.charAt(0) }}</el-avatar>
                          <span class="member-chip__role">Dev</span>
                          <span class="member-chip__name">{{ ver.devLeader }}</span>
                        </div>
                        <div v-if="ver.testLeader" class="member-chip">
                          <el-avatar :size="18" :src="ver.testLeaderAvatar || ''">{{ ver.testLeader.charAt(0) }}</el-avatar>
                          <span class="member-chip__role">QA</span>
                          <span class="member-chip__name">{{ ver.testLeader }}</span>
                        </div>
                      </div>

                      <!-- 第四行：统计 -->
                      <div class="version-card__row-4">
                        <div class="stat-chips">
                          <span class="stat-chip stat-chip--plan">
                            <el-icon><DocumentChecked /></el-icon>{{ ver.planCaseExecuted }}/{{ ver.planCaseTotal }}
                          </span>
                          <span class="stat-chip stat-chip--task">
                            <el-icon><Tickets /></el-icon>{{ ver.taskDone }}/{{ ver.taskTotal }}
                          </span>
                          <span
                            class="stat-chip stat-chip--bug"
                            @click.stop="goToBugPage(ver)"
                          >
                            <el-icon><WarningFilled /></el-icon>{{ ver.bugCount }}
                          </span>
                        </div>
                      </div>

                      <!-- 第五行：关联项目 -->
                      <div v-if="ver.projectNames && ver.projectNames.length" class="version-card__row-5">
                        <el-tag
                          v-for="p in ver.projectNames.slice(0, 4)"
                          :key="p"
                          size="small"
                          type="info"
                          effect="plain"
                          round
                        >{{ p }}</el-tag>
                        <span v-if="ver.projectNames.length > 4" class="more-tag">+{{ ver.projectNames.length - 4 }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </el-collapse-transition>
            </div>
          </div>
        </el-collapse-transition>
      </div>
    </div>

    <!-- 空状态 -->
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

    <VersionDialog
      v-model:visible="dialogVisible"
      :editing-id="editingId"
      :initial-form="editingForm"
      :story-options="storyOptions"
      :pm-user-list="pmUserList"
      :dev-user-list="devUserList"
      :test-user-list="testUserList"
      :project-options="projectOptions"
      @saved="fetchList"
    />
    <VersionDetailDialog v-model:visible="detailVisible" :version="detailVersion" />
    <VersionArchiveDialog v-model:visible="archiveDialogVisible" @refresh="fetchList" />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, ElCollapseTransition } from 'element-plus';
import {
  Plus, Search, ArrowRight, Calendar, Document,
  Tickets, WarningFilled, DocumentChecked, FolderOpened,
} from '@element-plus/icons-vue';
import { getVersionList, deleteVersion, submitTest, passTest, rejectTest } from '@/api/version';
import { getUserList } from '@/api/user';
import { getStoryList } from '@/api/story';
import { getProjectList } from '@/api/project';
import VersionDialog from './components/VersionDialog.vue';
import VersionDetailDialog from './components/VersionDetailDialog.vue';
import VersionArchiveDialog from './components/VersionArchiveDialog.vue';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const pmUserList = ref([]);
const devUserList = ref([]);
const testUserList = ref([]);
const storyOptions = ref([]);
const projectOptions = ref([]);

const fetchOptions = async () => {
  try {
    const [userRes, storyRes, projectRes] = await Promise.all([
      getUserList(),
      getStoryList({ page: 1, pageSize: 999 }),
      getProjectList({ status: '启用' }),
    ]);
    const users = (userRes.data || []).map((u) => ({
      id: u.id,
      label: u.first_name || u.username,
      roleName: u.roleName,
      avatar: u.avatar || '',
      dept: u.dept || '',
    }));
    pmUserList.value = users.filter((u) => u.roleName === '产品经理' || u.roleName === '管理层');
    devUserList.value = users.filter((u) => u.roleName === '开发人员' || u.roleName === '管理层');
    testUserList.value = users.filter((u) => u.roleName === '测试人员' || u.roleName === '管理层');
    storyOptions.value = (storyRes.data.list || []).map((s) => ({
      id: s.id,
      title: s.title,
    }));
    projectOptions.value = (projectRes.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status || '',
    }));
  } catch { /* ignore */ }
};

const versions = ref([]);
const queryParams = ref({ name: '', status: '', manager: '' });
const expandedYears = ref(new Set());
const expandedQuarters = ref(new Set());

const hasFilter = computed(
  () => queryParams.value.name || queryParams.value.status || queryParams.value.manager,
);

const getQuarter = (dateStr) => {
  if (!dateStr) return null;
  const month = new Date(dateStr).getMonth() + 1;
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
};
const getYear = (dateStr) => {
  if (!dateStr) return null;
  return String(new Date(dateStr).getFullYear());
};

const groupedVersions = computed(() => {
  const filtered = versions.value.filter((v) => {
    if (queryParams.value.name && !v.name.includes(queryParams.value.name)) return false;
    if (queryParams.value.status && v.status !== queryParams.value.status) return false;
    if (queryParams.value.manager && v.manager !== queryParams.value.manager) return false;
    return true;
  });
  const yearMap = {};
  filtered.forEach((ver) => {
    const dateKey = ver.startDate || ver.created_at || '';
    const year = getYear(dateKey) || '未规划';
    const quarter = getQuarter(dateKey) || '未定';
    if (!yearMap[year]) yearMap[year] = {};
    if (!yearMap[year][quarter]) yearMap[year][quarter] = [];
    yearMap[year][quarter].push(ver);
  });
  // 未规划排最后
  const sortKey = (y) => (y === '未规划' ? '0000' : y);
  return Object.keys(yearMap)
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
    .map((year) => {
      const quarters = Object.keys(yearMap[year])
        .sort((a, b) => {
          if (a === '未定') return 1;
          if (b === '未定') return -1;
          return b.localeCompare(a);
        })
        .map((quarter) => ({
          quarter,
          versions: yearMap[year][quarter],
        }));
      return {
        year,
        total: quarters.reduce((s, q) => s + q.versions.length, 0),
        quarters,
      };
    });
});

const initExpanded = () => {
  if (groupedVersions.value.length === 0) return;
  const latestYear = groupedVersions.value[0];
  expandedYears.value = new Set([latestYear.year]);
  if (latestYear.quarters.length > 0) {
    expandedQuarters.value = new Set([
      `${latestYear.year}-${latestYear.quarters[0].quarter}`,
    ]);
  }
};

const toggleYear = (year) => {
  const s = new Set(expandedYears.value);
  if (s.has(year)) {
    s.delete(year);
  } else {
    s.add(year);
  }
  expandedYears.value = s;
};
const toggleQuarter = (year, quarter) => {
  const key = `${year}-${quarter}`;
  const s = new Set(expandedQuarters.value);
  if (s.has(key)) {
    s.delete(key);
  } else {
    s.add(key);
  }
  expandedQuarters.value = s;
};

const mapVersion = (v) => ({
  ...v,
  manager: v.manager_name || '',
  managerAvatar: v.manager_avatar || '',
  manager_raw: v.manager || null,
  devLeader: v.dev_leader_name || '',
  devLeaderAvatar: v.dev_leader_avatar || '',
  devLeader_raw: v.dev_leader || null,
  testLeader: v.test_leader_name || '',
  testLeaderAvatar: v.test_leader_avatar || '',
  testLeader_raw: v.test_leader || null,
  storyTitle: v.story_title || '',
  startDate: v.start_date || '',
  endDate: v.end_date || '',
  taskTotal: v.task_total || 0,
  taskDone: v.task_done || 0,
  devTaskTotal: v.dev_task_total || 0,
  devTaskDone: v.dev_task_done || 0,
  devTaskProgressSum: v.dev_task_progress_sum || 0,
  planCaseTotal: v.plan_case_total || 0,
  planCaseExecuted: v.plan_case_executed || 0,
  planCount: v.plan_count || 0,
  bugCount: v.bug_count || 0,
  projectIds: v.project_ids || [],
  projectNames: v.project_names || [],
  desc: v.description || '',
});

const fetchList = async () => {
  loading.value = true;
  try {
    const res = await getVersionList({ page: 1, pageSize: 999 });
    versions.value = (res.data.list || []).map(mapVersion);
    initExpanded();
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  fetchOptions();
  await fetchList();
  const { storyId, storyTitle, openId } = route.query;
  if (storyId && storyTitle) {
    editingId.value = null;
    editingForm.value = {
      name: storyTitle,
      story: Number(storyId),
      manager: null,
      devLeader: null,
      testLeader: null,
      status: '未开始',
      startDate: '',
      endDate: '',
      desc: '',
    };
    dialogVisible.value = true;
    router.replace({ path: route.path });
  } else if (openId) {
    const target = versions.value.find((v) => String(v.id) === String(openId));
    if (target) handleDetail(target);
  }
});

const canVerSubmit = (ver) => {
  const ts = ver.test_status;
  return (!ts || ts === '未提测' || ts === '测试驳回') && ver.status === '进行中';
};

const handleSearch = () => initExpanded();
const handleReset = () => {
  queryParams.value = { name: '', status: '', manager: '' };
  initExpanded();
};

const statusType = (s) => ({
  未开始: 'info',
  进行中: 'primary',
  已完成: 'success',
  已暂停: 'warning',
}[s] || 'info');
const statusDotClass = (s) => ({
  未开始: '',
  进行中: 'is-active',
  已完成: 'is-done',
  已暂停: 'is-paused',
}[s] || '');

const goToBugPage = (ver) => {
  router.push({
    path: '/test/bug',
    query: { versionId: ver.id, versionName: ver.name },
  });
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
      fetchList();
    }).catch(() => {});
  } catch { /* cancel */ }
};
const handlePassTest = async (ver) => {
  try {
    await ElMessageBox.confirm(`确定「${ver.name}」测试通过？`, '确认', { type: 'success' });
    await passTest(ver.id);
    ElMessage.success('测试通过');
    fetchList();
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
      fetchList();
    }).catch(() => {});
  } catch { /* cancel */ }
};

/* ── 新建 / 编辑 ── */
const dialogVisible = ref(false);
const editingId = ref(null);
const editingForm = ref(null);
const handleAdd = () => {
  editingId.value = null;
  editingForm.value = null;
  dialogVisible.value = true;
};
const handleEdit = (ver) => {
  editingId.value = ver.id;
  editingForm.value = {
    name: ver.name,
    story: ver.story || null,
    projectIds: ver.projectIds || [],
    manager: ver.manager_raw || null,
    devLeader: ver.devLeader_raw || null,
    testLeader: ver.testLeader_raw || null,
    status: ver.status,
    startDate: ver.startDate,
    endDate: ver.endDate,
    desc: ver.desc,
  };
  dialogVisible.value = true;
};
const handleDelete = (ver) => {
  ElMessageBox.confirm(
    `确定删除版本「${ver.name}」？删除后不可恢复。`,
    '删除确认',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  )
    .then(async () => {
      await deleteVersion(ver.id);
      ElMessage.success('已删除');
      fetchList();
    })
    .catch(() => {});
};

/* ── 详情 ── */
const detailVisible = ref(false);
const detailVersion = ref(null);
const archiveDialogVisible = ref(false);
const handleDetail = async (ver) => {
  detailVersion.value = { ...ver, tasks: [], bugs: [] };
  detailVisible.value = true;
  try {
    const { getTaskList } = await import('@/api/task');
    const { getBugList } = await import('@/api/bug');
    const [taskRes, bugRes] = await Promise.all([
      getTaskList({ versionId: ver.id, page: 1, pageSize: 999 }),
      getBugList({ versionId: ver.id, page: 1, pageSize: 999 }),
    ]);
    const taskList = (taskRes.data.list || []).map((t) => ({
      ...t,
      assignee: t.assignee_name || '',
    }));
    const bugList = (bugRes.data.list || []).map((b) => ({
      ...b,
      assignee: b.assignee_name || '',
    }));
    detailVersion.value = {
      ...detailVersion.value,
      tasks: taskList,
      bugs: bugList,
      taskTotal: taskList.length,
      taskDone: taskList.filter((t) => t.status === '已完成').length,
      bugCount: bugList.length,
    };
  } catch { /* ignore */ }
};
</script>

<style scoped lang="scss">
.version-page {
  padding: 20px 24px;
}

/* ── 页头 ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.header-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.page-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ── 筛选栏 ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

/* ── 年份分组 ── */
.version-grouped {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.year-group {
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
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
    &:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: -2px; }
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
    }
  }
}

/* ── 季度分组 ── */
.quarter-list {
  padding: 4px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.quarter-group {
  border-radius: 8px;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
    &:hover { background: var(--bg-hover); }
    &:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: -2px; }
  }
  &__label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-regular);
    flex: 1;
  }
  &__count {
    font-size: 12px;
    color: var(--text-placeholder);
  }
}
.collapse-icon {
  font-size: 14px;
  color: var(--text-secondary);
  transition: transform 0.25s ease;
  &.is-open { transform: rotate(90deg); }
  &--sm { font-size: 12px; }
}

/* ── 时间轴 ── */
.version-timeline {
  position: relative;
  padding: 12px 16px 12px 32px;

  &::before {
    content: '';
    position: absolute;
    left: 19px;
    top: 18px;
    bottom: 18px;
    width: 2px;
    background: var(--border-light);
    border-radius: 1px;
  }
}

/* ── 版本卡片 ── */
.version-card {
  position: relative;
  margin-bottom: 12px;
  &:last-child { margin-bottom: 0; }

  &__dot {
    position: absolute;
    left: -16px;
    top: 18px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--border-color);
    border: 2px solid var(--bg-card);
    box-shadow: 0 0 0 2px var(--border-color);
    z-index: 1;
    &.is-active { background: var(--el-color-primary); box-shadow: 0 0 0 2px var(--el-color-primary-light-5); }
    &.is-done { background: var(--el-color-success); box-shadow: 0 0 0 2px var(--el-color-success-light-5); }
    &.is-paused { background: var(--el-color-warning); box-shadow: 0 0 0 2px var(--el-color-warning-light-5); }
  }

  &__body {
    background: var(--bg-card);
    border-radius: 12px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: var(--shadow-card);
    &:hover {
      box-shadow: var(--shadow-hover);
      transform: translateY(-2px);
    }
  }
}

/* ── 卡片行 ── */
.version-card__row-1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.version-card__title-area {
  display: flex;
  align-items: center;
  gap: 8px;
}
.version-card__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.version-card__actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  .version-card__body:hover & { opacity: 1; }
}

.version-card__row-2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  .el-icon { font-size: 13px; }
  &--story { color: var(--text-regular); }
}

.version-card__row-3 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-regular);
  .el-avatar {
    font-size: 10px;
    background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
    color: var(--text-inverse);
  }
  &__role { color: var(--text-secondary); font-size: 11px; }
  &__name { font-weight: 500; }
}

.version-card__row-4 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.stat-chips {
  display: flex;
  gap: 8px;
}
.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  .el-icon { font-size: 12px; }
  &--plan  { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &--task { background: var(--bg-hover); color: var(--text-regular); }
  &--bug {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
    cursor: pointer;
    transition: background 0.15s;
    &:hover { background: var(--el-color-danger-light-8); }
  }
}

.version-card__row-5 {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.more-tag {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ── 空状态 ── */
.empty-state {
  padding: 80px 0;
}
.empty-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-regular);
  margin: 0 0 4px;
}
.empty-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 16px;
}
</style>
