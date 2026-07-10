<template>
  <div class="dashboard">
    <!-- ═══ KPI 统计条 ═══ -->
    <div class="kpi-strip">
      <div
        v-for="(item, idx) in stats"
        :key="item.key"
        class="kpi-pill"
        :style="{ '--kpi-delay': idx * 0.06 + 's' }"
        @click="router.push(item.path)"
      >
        <div class="kpi-icon" :style="{ background: item.gradient }">
          <el-icon :size="20"><component :is="item.icon" /></el-icon>
        </div>
        <div class="kpi-body">
          <span class="kpi-value">{{ displayValues[item.key] ?? 0 }}</span>
          <span class="kpi-label">{{ item.title }}</span>
        </div>
        <div class="kpi-spark" :style="{ background: item.accent }"></div>
      </div>
    </div>

    <!-- ═══ 主内容区：三栏布局 ═══ -->
    <div class="main-grid">
      <!-- 左列：我的待办 -->
      <section class="focus-panel">
        <div class="panel-top">
          <h3 class="panel-title"><el-icon :size="18"><List /></el-icon>我的待办</h3>
          <span class="panel-badge">{{ todoTasks.length }}</span>
        </div>
        <div class="panel-body" v-if="todoTasks.length">
          <template v-for="group in taskGroups" :key="group.key">
            <div class="time-label" :class="'tl-' + group.key">
              <span class="time-dot"></span>{{ group.label }}
              <span class="time-count">{{ group.items.length }}</span>
            </div>
            <div
              v-for="task in group.items"
              :key="task.id"
              class="task-row"
              :class="{ 'is-overdue': group.key === 'overdue' }"
              @click="handleTaskClick(task)"
            >
              <span class="task-priority-dot" :class="'pri-' + task.priority"></span>
              <div class="task-main">
                <span class="task-name">{{ task.name }}</span>
                <div class="task-meta">
                  <span class="task-version">{{ task.versionName || '未关联版本' }}</span>
                  <template v-if="task.deadline">
                    <span class="meta-sep">·</span>
                    <span class="task-deadline" :class="{ 'is-overdue-text': group.key === 'overdue' }">
                      {{ formatRelativeDeadline(task.deadline) }}
                    </span>
                  </template>
                </div>
              </div>
              <el-icon class="task-arrow" :size="14"><ArrowRight /></el-icon>
            </div>
          </template>
        </div>
        <div v-else class="panel-empty">
          <el-icon :size="36"><Checked /></el-icon>
          <p>暂无待办任务</p>
        </div>
      </section>

      <!-- 中列：Bug 雷达 -->
      <section class="focus-panel">
        <div class="panel-top">
          <h3 class="panel-title"><el-icon :size="18"><WarningFilled /></el-icon>Bug 雷达</h3>
          <div class="bug-tabs">
            <button
              v-for="f in bugFilters" :key="f.key"
              class="bug-tab"
              :class="{ active: bugActiveFilter === f.key }"
              @click.stop="bugActiveFilter = f.key"
            >{{ f.label }}</button>
          </div>
        </div>
        <div class="panel-body" v-if="filteredBugs.length">
          <div
            v-for="bug in filteredBugs" :key="bug.id"
            class="bug-row" :class="'sev-' + bug.severity"
            @click="router.push({ path: '/test/bug', query: { openId: bug.id } })"
          >
            <span class="bug-sev-bar"></span>
            <div class="bug-main">
              <span class="bug-title">{{ bug.title }}</span>
              <div class="bug-meta">
                <span class="bug-severity-tag" :class="'sev-tag-' + bug.severity">{{ bug.severity }}</span>
                <span class="bug-assignee" v-if="bug.assignee">{{ bug.assignee }}</span>
              </div>
            </div>
            <el-tag :type="getStatusType(bug.status)" size="small" class="bug-status" effect="plain">{{ bug.status }}</el-tag>
          </div>
        </div>
        <div v-else class="panel-empty">
          <el-icon :size="36"><CircleCheck /></el-icon>
          <p>{{ bugActiveFilter === 'all' ? '暂无Bug记录' : '该分类下没有Bug' }}</p>
        </div>
      </section>

      <!-- 右列：OKR + 通知 + 快捷 -->
      <aside class="right-col">
        <!-- OKR 摘要 -->
        <div class="side-card okr-card" @click="router.push('/okr')">
          <div class="side-card-head">
            <h3 class="panel-title"><el-icon :size="18"><TrendCharts /></el-icon>OKR 概览</h3>
          </div>
          <div v-if="okrData" class="okr-body">
            <div class="okr-ring-wrap">
              <svg class="okr-ring" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--bg-hover)" stroke-width="3" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--el-color-primary)" stroke-width="3"
                  stroke-linecap="round" :stroke-dasharray="`${okrData.progress * 1.005} 100.5`"
                  transform="rotate(-90 20 20)" />
              </svg>
              <span class="okr-ring-pct">{{ Math.round(okrData.progress) }}%</span>
            </div>
            <div class="okr-stats">
              <div class="okr-stat"><span class="okr-stat-val">{{ okrData.objCount }}</span><span class="okr-stat-lbl">目标</span></div>
              <div class="okr-stat"><span class="okr-stat-val">{{ okrData.krCount }}</span><span class="okr-stat-lbl">关键结果</span></div>
            </div>
            <div class="okr-period" v-if="okrData.periodName">{{ okrData.periodName }}</div>
          </div>
          <div v-else class="okr-body okr-empty">
            <el-icon :size="24"><Aim /></el-icon>
            <span>暂无OKR数据</span>
          </div>
        </div>

        <!-- 最近通知 -->
        <div class="side-card notif-card">
          <div class="side-card-head">
            <h3 class="panel-title"><el-icon :size="18"><Bell /></el-icon>最近通知</h3>
            <span v-if="unreadCount > 0" class="notif-unread">{{ unreadCount }}</span>
          </div>
          <div class="notif-list" v-if="recentNotifs.length">
            <div
              v-for="n in recentNotifs" :key="n.id"
              class="notif-item" :class="{ unread: !n.is_read }"
              @click="handleNotifClick(n)"
            >
              <span class="notif-dot" :class="'nt-' + n.notification_type"></span>
              <div class="notif-body">
                <span class="notif-text">{{ n.content }}</span>
                <span class="notif-time">{{ formatNotifTime(n.created_at) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="notif-list notif-empty">
            <el-icon :size="24"><Bell /></el-icon>
            <span>暂无通知</span>
          </div>
        </div>
      </aside>
    </div>

    <!-- ═══ 版本脉搏 ═══ -->
    <section class="version-section">
      <div class="panel-top">
        <h3 class="panel-title"><el-icon :size="18"><FolderOpened /></el-icon>版本脉搏</h3>
        <el-link type="primary" :underline="false" @click="router.push('/project/versions')">
          查看全部<el-icon :size="14" style="margin-left:2px;vertical-align:middle"><ArrowRight /></el-icon>
        </el-link>
      </div>
      <div v-if="versionProgress.length" class="version-grid">
        <div v-for="ver in versionProgress" :key="ver.id" class="ver-card"
          @click="router.push({ path: '/project/versions', query: { versionId: ver.id } })">
          <div class="ver-top">
            <span class="ver-name">{{ ver.name }}</span>
            <div class="ver-tags">
              <el-tag v-if="ver.test_status && ver.test_status !== '未提测'" :type="testTagType(ver.test_status)" size="small" effect="plain">{{ ver.test_status === '测试中' ? '测试中' : ver.test_status === '测试通过' ? '已通过' : '已驳回' }}</el-tag>
              <el-tag :type="getProjectStatusType(ver.status)" size="small" effect="plain">{{ ver.status }}</el-tag>
            </div>
          </div>
          <div class="ver-bar-wrap">
            <span class="ver-bar-label">开发</span>
            <div class="ver-bar"><div class="ver-bar-fill" :style="{ width: ver.devProgress + '%', background: progressColor(ver.devProgress) }"></div></div>
            <span class="ver-pct">{{ ver.devProgress }}%</span>
          </div>
          <div v-if="ver.planCaseTotal > 0" class="ver-bar-wrap">
            <span class="ver-bar-label">测试</span>
            <div class="ver-bar"><div class="ver-bar-fill" :style="{ width: ver.testProgress + '%', background: progressColor(ver.testProgress) }"></div></div>
            <span class="ver-pct">{{ ver.testProgress }}%</span>
          </div>
          <div class="ver-bottom">
            <span class="ver-lead">{{ ver.manager || '未指定' }}</span>
            <span class="ver-stat">{{ ver.taskDone }}<span class="ver-stat-dim"> / {{ ver.taskTotal }}</span></span>
          </div>
        </div>
      </div>
      <div v-else class="panel-empty"><el-icon :size="36"><FolderOpened /></el-icon><p>暂无版本数据</p></div>
    </section>

    <!-- ═══ 快捷创建 FAB ═══ -->
    <el-dropdown trigger="click" @command="handleQuickCreate" placement="top-end">
      <button class="fab-btn">
        <el-icon :size="22"><Plus /></el-icon>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="task"><el-icon><EditPen /></el-icon>新建任务</el-dropdown-item>
          <el-dropdown-item command="bug"><el-icon><Warning /></el-icon>提交Bug</el-dropdown-item>
          <el-dropdown-item command="story"><el-icon><Document /></el-icon>创建需求</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import {
  Folder, List, Warning, DocumentChecked, Checked, ArrowRight,
  WarningFilled, CircleCheck, FolderOpened, TrendCharts,
  Plus, EditPen, Document, Bell, Aim,
} from '@element-plus/icons-vue';
import { getProjectList } from '@/api/project';
import { getTaskList } from '@/api/task';
import { getBugList } from '@/api/bug';
import { getTestcaseList } from '@/api/testcase';
import { getVersionList } from '@/api/version';
import { getStoryList } from '@/api/story';
import { getPeriodList, getObjectiveList } from '@/api/okr';
import { getNotificationList } from '@/api/notification';

const router = useRouter();
const store = useStore();

// ── KPI ──
const stats = ref([
  { key: 'project', title: '项目总数', value: 0, icon: Folder, gradient: 'linear-gradient(135deg, #667eea, #764ba2)', accent: 'var(--color-badge-indigo)', path: '/project' },
  { key: 'task', title: '进行中任务', value: 0, icon: List, gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)', accent: 'var(--el-color-success)', path: '/project/versions' },
  { key: 'bug', title: '待修复Bug', value: 0, icon: Warning, gradient: 'linear-gradient(135deg, #f093fb, #f5576c)', accent: 'var(--el-color-danger)', path: '/test/bug' },
  { key: 'testcase', title: '测试用例', value: 0, icon: DocumentChecked, gradient: 'linear-gradient(135deg, #fa709a, #fee140)', accent: 'var(--el-color-warning)', path: '/test/testcase' },
  { key: 'review', title: '待审核', value: 0, icon: EditPen, gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)', accent: 'var(--color-badge-teal)', path: '/story' },
]);

// 数字动画
const displayValues = ref<Record<string, number>>({});
function animateValue(key: string, from: number, to: number, duration = 800) {
  const start = performance.now();
  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    displayValues.value[key] = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── 待办任务 + 时间分组 ──
const todoTasks = ref<any[]>([]);

const taskGroups = computed(() => {
  const today = new Date(new Date().toDateString());
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
  const groups: Record<string, any[]> = { overdue: [], today: [], week: [], later: [] };
  for (const t of todoTasks.value) {
    if (!t.deadline) { groups.later.push(t); continue; }
    const d = new Date(t.deadline);
    const dDay = new Date(d.toDateString());
    if (dDay < today) groups.overdue.push(t);
    else if (dDay.getTime() === today.getTime()) groups.today.push(t);
    else if (dDay < in7) groups.week.push(t);
    else groups.later.push(t);
  }
  const meta = [
    { key: 'overdue', label: '已逾期' },
    { key: 'today', label: '今天' },
    { key: 'week', label: '本周' },
    { key: 'later', label: '更远' },
  ];
  return meta.filter(m => groups[m.key].length > 0).map(m => ({ ...m, items: groups[m.key] }));
});

// ── Bug ──
const recentBugs = ref<any[]>([]);
const bugActiveFilter = ref('all');
const bugFilters = [{ key: 'all', label: '全部' }, { key: '致命', label: '致命' }, { key: '严重', label: '严重' }];
const filteredBugs = computed(() => {
  if (bugActiveFilter.value === 'all') return recentBugs.value;
  return recentBugs.value.filter((b: any) => b.severity === bugActiveFilter.value);
});

// ── 版本进度 ──
const versionProgress = ref<any[]>([]);

// ── OKR 摘要 ──
const okrData = ref<any>(null);

// ── 通知 ──
const unreadCount = computed(() => store.getters.unreadCount || 0);
const recentNotifs = ref<any[]>([]);

// ── 数据获取 ──
const fetchData = async () => {
  try {
    const userId = store.state.user?.id;
    const [
      projRes, taskInProgressRes, bugPendingRes, testcaseRes,
      todoRes, recentBugRes, versionListRes, storyReviewRes,
      periodRes, notifRes,
    ] = await Promise.all([
      getProjectList({ page: 1, pageSize: 1 }),
      getTaskList({ status: '进行中', page: 1, pageSize: 1 }),
      getBugList({ status: '待处理,处理中', page: 1, pageSize: 1 }),
      getTestcaseList({ page: 1, pageSize: 1 }),
      userId ? getTaskList({ assigneeId: userId, excludeStatus: '已完成', page: 1, pageSize: 10 })
        : Promise.resolve({ data: { list: [], total: 0 } }),
      getBugList({ status: '待处理,处理中', page: 1, pageSize: 10 }),
      getVersionList({ page: 1, pageSize: 6 }),
      getStoryList({ tab: 'pool', page: 1, pageSize: 1 }),
      getPeriodList({ page: 1, pageSize: 1 }),
      getNotificationList({ page: 1, pageSize: 5, is_read: false }),
    ]);

    // KPI 数值
    const reviewTotal = storyReviewRes.data?.total || 0;
    const newValues = {
      project: projRes.data.total || 0,
      task: taskInProgressRes.data.total || 0,
      bug: bugPendingRes.data.total || 0,
      testcase: testcaseRes.data.total || 0,
      review: reviewTotal,
    };
    stats.value.forEach((s) => { s.value = newValues[s.key]; });

    await nextTick();
    Object.entries(newValues).forEach(([key, val]) => {
      displayValues.value[key] = 0;
      if (val > 0) animateValue(key, 0, val);
    });

    // 待办
    todoTasks.value = (todoRes.data.list || []).map((t: any) => ({
      id: t.id, name: t.name, versionId: t.version,
      versionName: t.version_name || '', priority: t.priority, deadline: t.deadline,
    }));

    // Bug
    recentBugs.value = (recentBugRes.data.list || []).map((b: any) => ({
      id: b.id, title: b.title, severity: b.severity, status: b.status, assignee: b.assignee_name || '',
    }));

    // 版本进度（动画）
    const versionsRaw = (versionListRes.data.list || []).map((v: any) => ({
      id: v.id, name: v.name, manager: v.manager_name || '',
      _devProgress: v.dev_task_progress || 0, devProgress: 0,
      _acceptanceProgress: v.acceptance_task_progress || 0, acceptanceProgress: 0,
      _testProgress: v.progress || 0, testProgress: 0,
      status: v.status, taskDone: v.task_done || 0, taskTotal: v.task_total || 0,
      test_status: v.test_status || '未提测',
      planCaseTotal: v.plan_case_total || 0,
      planCaseExecuted: v.plan_case_executed || 0,
    }));
    versionProgress.value = versionsRaw;
    await nextTick();
    requestAnimationFrame(() => {
      versionProgress.value = versionsRaw.map((v: any) => ({
        ...v, devProgress: v._devProgress, testProgress: v._testProgress, acceptanceProgress: v._acceptanceProgress,
      }));
    });

    // OKR 摘要
    const periods = periodRes.data?.list || [];
    if (periods.length > 0) {
      const currentPeriod = periods[0]; // 最新周期
      try {
        const objRes = await getObjectiveList({ periodId: currentPeriod.id, ownerId: 'me' });
        const objectives = objRes.data?.list || [];
        const totalKRs = objectives.reduce((sum: number, o: any) => sum + (o.key_results?.length || 0), 0);
        const avgProgress = objectives.length > 0
          ? objectives.reduce((sum: number, o: any) => sum + (o.progress || 0), 0) / objectives.length : 0;
        okrData.value = {
          periodName: currentPeriod.name,
          objCount: objectives.length,
          krCount: totalKRs,
          progress: avgProgress,
        };
      } catch { /* OKR 加载失败静默忽略 */ }
    }

    // 通知
    recentNotifs.value = notifRes.data?.list || [];
  } catch {
    // 获取首页数据失败
  }
};

onMounted(fetchData);

// ── 工具函数 ──
const handleTaskClick = (task: any) => {
  if (task.versionId) router.push({ path: '/project/versions', query: { versionId: task.versionId } });
};

const isTaskOverdue = (deadline: string) => new Date(deadline) < new Date(new Date().toDateString());

const formatRelativeDeadline = (deadline: string) => {
  const d = new Date(deadline);
  const today = new Date(new Date().toDateString());
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `已逾期 ${Math.abs(diff)} 天`;
  if (diff === 0) return '今天截止';
  if (diff === 1) return '明天截止';
  if (diff <= 7) return `${diff} 天后截止`;
  return deadline;
};

const getStatusType = (s: string) => ({ 待处理: 'info', 处理中: 'warning', 已解决: 'success' }[s] || 'info');
const getProjectStatusType = (s: string) => ({ 未开始: 'info', 进行中: 'primary', 已完成: 'success', 已暂停: 'warning' }[s] || 'info');
const testTagType = (s: string) => ({ 测试中: 'warning', 测试通过: 'success', 测试驳回: 'danger' }[s] || 'info');
const progressColor = (p: number) => {
  if (p <= 0) return 'var(--text-placeholder)';
  if (p < 30) return 'var(--text-secondary)';
  if (p < 70) return 'var(--el-color-primary)';
  return 'var(--el-color-success)';
};

const formatNotifTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${diff} 分钟前`;
  if (diff < 1440) return `${Math.floor(diff / 60)} 小时前`;
  if (diff < 10080) return `${Math.floor(diff / 1440)} 天前`;
  return d.toLocaleDateString();
};

const handleNotifClick = async (n: any) => {
  if (!n.is_read) {
    try { await store.dispatch('notification/markRead', n.id); n.is_read = true; } catch {}
  }
  const routeMap: Record<string, (id: number) => any> = {
    story: (id: number) => ({ path: '/story', query: { openId: id } }),
    bug: (id: number) => ({ path: '/test/bug', query: { openId: id } }),
    okr: () => ({ path: '/okr' }),
    ticket: (id: number) => ({ path: '/ticket', query: { openId: id } }),
  };
  const fn = routeMap[n.source_type];
  if (fn) router.push(fn(n.source_id)).catch(() => {});
};

const handleQuickCreate = (cmd: string) => {
  const map: Record<string, string> = { task: '/project/versions', bug: '/test/bug', story: '/story' };
  if (map[cmd]) router.push(map[cmd]);
};
</script>

<style scoped lang="scss">
.dashboard { margin: 0 auto; padding: 4px 12px 12px; }

/* ── KPI 统计条 ── */
.kpi-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 20px; }
.kpi-pill {
  position: relative; display: flex; align-items: center; gap: 14px;
  padding: 18px 20px; background: var(--bg-card); border-radius: 14px;
  cursor: pointer; overflow: hidden;
  transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease;
  box-shadow: var(--shadow-card);
  animation: pillIn .5s ease both; animation-delay: var(--kpi-delay, 0s);
  &:hover {
    transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,.08);
    .kpi-spark { opacity: .18; transform: scaleX(1); }
  }
}
@keyframes pillIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.kpi-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,.15);
}
.kpi-body { flex: 1; min-width: 0; }
.kpi-value { display: block; font-size: 26px; font-weight: 700; color: var(--text-primary); line-height: 1.15; letter-spacing: -.5px; font-variant-numeric: tabular-nums; }
.kpi-label { display: block; font-size: 13px; color: var(--text-secondary); margin-top: 3px; font-weight: 500; }
.kpi-spark {
  position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
  opacity: .08; transform: scaleX(.3); transform-origin: left;
  transition: opacity .3s, transform .4s cubic-bezier(.34,1.56,.64,1);
  border-radius: 0 0 14px 14px;
}

/* ── 三栏主内容区 ── */
.main-grid { display: grid; grid-template-columns: 1fr 1fr 340px; gap: 16px; margin-bottom: 20px; }
.focus-panel {
  background: var(--bg-card); border-radius: 14px; box-shadow: var(--shadow-card);
  display: flex; flex-direction: column; min-height: 340px; overflow: hidden;
}
.panel-top { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; gap: 12px; }
.panel-title {
  display: flex; align-items: center; gap: 7px;
  font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap;
  .el-icon { color: var(--text-secondary); }
}
.panel-badge {
  min-width: 22px; height: 22px; line-height: 22px; padding: 0 7px;
  font-size: 12px; font-weight: 600; text-align: center;
  color: var(--text-secondary); background: var(--bg-hover); border-radius: 11px;
}
.panel-body { flex: 1; overflow-y: auto; padding: 0 12px 8px; }
.panel-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; color: var(--text-placeholder); padding: 32px 20px;
  .el-icon { opacity: .45; } p { margin: 0; font-size: 13px; }
}

/* ── 时间分组标签 ── */
.time-label {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px 4px; font-size: 12px; font-weight: 600;
  color: var(--text-secondary);
  &:first-child { padding-top: 4px; }
}
.time-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-placeholder); }
.time-count { margin-left: auto; font-size: 11px; color: var(--text-placeholder); font-weight: 500; }
.tl-overdue { color: var(--el-color-danger); .time-dot { background: var(--el-color-danger); } }
.tl-today { color: var(--el-color-warning); .time-dot { background: var(--el-color-warning); } }
.tl-week .time-dot { background: var(--el-color-primary); }

/* ── 任务行 ── */
.task-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 10px; border-radius: 10px;
  cursor: pointer; transition: background .18s, transform .18s;
  &:hover { background: var(--bg-hover); transform: translateX(3px); .task-arrow { opacity: 1; transform: translateX(0); } }
  &.is-overdue { background: rgba(var(--el-color-danger-rgb, 245,108,108), .04); &:hover { background: rgba(var(--el-color-danger-rgb, 245,108,108), .08); } }
}
.task-priority-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--text-placeholder); &.pri-高 { background: var(--el-color-danger); } &.pri-中 { background: var(--el-color-warning); } &.pri-低 { background: var(--el-color-info); } }
.task-main { flex: 1; min-width: 0; }
.task-name { display: block; font-size: 13px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; }
.task-meta { display: flex; align-items: center; gap: 4px; margin-top: 3px; font-size: 12px; }
.task-version { color: var(--text-secondary); }
.meta-sep { color: var(--text-placeholder); }
.task-deadline { color: var(--text-placeholder); &.is-overdue-text { color: var(--el-color-danger); font-weight: 500; } }
.task-arrow { color: var(--text-placeholder); opacity: 0; transform: translateX(-4px); transition: opacity .2s, transform .2s; flex-shrink: 0; }

/* ── Bug 行 ── */
.bug-tabs { display: flex; gap: 4px; background: var(--bg-hover); border-radius: 8px; padding: 3px; }
.bug-tab { border: none; background: transparent; padding: 4px 10px; font-size: 12px; font-weight: 500; color: var(--text-secondary); border-radius: 6px; cursor: pointer; transition: all .18s; font-family: inherit;
  &:hover { color: var(--text-primary); } &.active { background: var(--bg-card); color: var(--text-primary); box-shadow: var(--shadow-card); }
}
.bug-row {
  display: flex; align-items: center; gap: 10px; padding: 11px 10px; border-radius: 10px;
  cursor: pointer; transition: background .18s, transform .18s;
  &:hover { background: var(--bg-hover); transform: translateX(3px); }
  &.sev-致命, &.sev-严重 { background: rgba(var(--el-color-danger-rgb, 245,108,108), .03); &:hover { background: rgba(var(--el-color-danger-rgb, 245,108,108), .07); } }
}
.bug-sev-bar { width: 3px; height: 28px; border-radius: 2px; flex-shrink: 0; background: var(--text-placeholder); transition: background .2s;
  .sev-致命 & { background: var(--el-color-danger); } .sev-严重 & { background: var(--el-color-danger); }
  .sev-一般 & { background: var(--el-color-warning); } .sev-轻微 & { background: var(--el-color-info); }
}
.bug-main { flex: 1; min-width: 0; }
.bug-title { display: block; font-size: 13px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; }
.bug-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; font-size: 12px; color: var(--text-secondary); }
.bug-severity-tag { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 4px; background: var(--bg-hover); color: var(--text-secondary);
  &.sev-tag-致命, &.sev-tag-严重 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.sev-tag-一般 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.sev-tag-轻微 { background: var(--el-color-info-light-9); color: var(--el-color-info); }
}
.bug-assignee { color: var(--text-placeholder); }
.bug-status { flex-shrink: 0; }

/* ── 右列 ── */
.right-col { display: flex; flex-direction: column; gap: 16px; }
.side-card { background: var(--bg-card); border-radius: 14px; box-shadow: var(--shadow-card); overflow: hidden; }
.side-card-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; }

/* OKR 摘要 */
.okr-card { cursor: pointer; transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .3s;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
}
.okr-body { padding: 0 18px 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.okr-ring-wrap { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
.okr-ring { width: 56px; height: 56px; }
.okr-ring-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--text-primary); }
.okr-stats { display: flex; gap: 16px; flex: 1; }
.okr-stat { display: flex; flex-direction: column; }
.okr-stat-val { font-size: 20px; font-weight: 700; color: var(--text-primary); line-height: 1.2; font-variant-numeric: tabular-nums; }
.okr-stat-lbl { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
.okr-period { width: 100%; font-size: 12px; color: var(--text-placeholder); margin-top: 4px; }
.okr-empty { flex-direction: column; align-items: center; justify-content: center; padding: 24px 18px; gap: 8px; color: var(--text-placeholder); span { font-size: 13px; } }

/* 通知 */
.notif-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.notif-unread {
  min-width: 20px; height: 20px; line-height: 20px; padding: 0 6px;
  font-size: 11px; font-weight: 600; text-align: center;
  color: var(--text-inverse); background: var(--el-color-danger); border-radius: 10px;
}
.notif-list { flex: 1; overflow-y: auto; padding: 0 12px 12px; }
.notif-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 18px; gap: 8px; color: var(--text-placeholder); span { font-size: 13px; } }
.notif-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 9px 10px; border-radius: 10px;
  cursor: pointer; transition: background .18s;
  &:hover { background: var(--bg-hover); }
  &.unread .notif-text { font-weight: 500; color: var(--text-primary); }
}
.notif-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; background: var(--text-placeholder);
  &.nt-story_review, &.nt-okr_review { background: var(--el-color-warning); }
  &.nt-bug_assigned, &.nt-bug_resolved, &.nt-bug_activated { background: var(--el-color-danger); }
  &.nt-comment_reply { background: var(--el-color-primary); }
  &.nt-ticket_assigned { background: var(--el-color-info); }
}
.notif-body { flex: 1; min-width: 0; }
.notif-text { display: block; font-size: 12px; color: var(--text-regular); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4; }
.notif-time { display: block; font-size: 11px; color: var(--text-placeholder); margin-top: 3px; }

/* ── 版本脉搏 ── */
.version-section { background: var(--bg-card); border-radius: 14px; box-shadow: var(--shadow-card); overflow: hidden; }
.version-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; padding: 0 20px 20px; }
.ver-card {
  padding: 16px 18px; background: var(--bg-elevated); border-radius: 12px; cursor: pointer;
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .3s, background .2s;
  box-shadow: var(--shadow-card);
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
}
.ver-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.ver-tags { display: flex; gap: 6px; }
.ver-name { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.ver-bar-wrap { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.ver-bar-label { font-size: 10px; color: var(--text-placeholder); font-weight: 500; min-width: 24px; text-transform: uppercase; }
.ver-bar { flex: 1; height: 6px; background: var(--bg-hover); border-radius: 3px; overflow: hidden; }
.ver-bar-fill { height: 100%; border-radius: 3px; transition: width .8s cubic-bezier(.34,1.56,.64,1); min-width: 0; }
.ver-pct { font-size: 13px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; min-width: 36px; text-align: right; }
.ver-bottom { display: flex; justify-content: space-between; align-items: center; }
.ver-lead { font-size: 12px; color: var(--text-secondary); }
.ver-stat { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.ver-stat-dim { font-weight: 400; color: var(--text-placeholder); }

/* ── 快捷创建 FAB ── */
.fab-btn {
  position: fixed; bottom: 32px; right: 32px; z-index: 100;
  width: 48px; height: 48px; border-radius: 50%;
  background: var(--el-color-primary); color: #fff; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,.18);
  transition: transform .2s, box-shadow .2s;
  &:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,.22); }
  &:active { transform: scale(.95); }
}

/* ── 响应式 ── */
@media (max-width: 1200px) {
  .main-grid { grid-template-columns: 1fr 1fr; }
  .right-col { grid-column: 1 / -1; flex-direction: row; }
  .side-card { flex: 1; }
}
@media (max-width: 900px) {
  .kpi-strip { grid-template-columns: repeat(3, 1fr); }
  .main-grid { grid-template-columns: 1fr; }
  .right-col { flex-direction: column; }
}
@media (max-width: 640px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
}

/* ── 深色模式 ── */
[data-theme='dark'] {
  .kpi-pill { box-shadow: var(--shadow-card); &:hover { box-shadow: 0 8px 28px rgba(0,0,0,.35); } }
  .focus-panel, .version-section, .side-card { box-shadow: var(--shadow-card); }
  .ver-card { box-shadow: var(--shadow-card); &:hover { box-shadow: 0 8px 24px rgba(0,0,0,.3); } }
  .bug-tab.active { box-shadow: var(--shadow-card); }
  .okr-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,.3); }
  .task-row.is-overdue { background: rgba(var(--el-color-danger-rgb, 245,108,108), .07); &:hover { background: rgba(var(--el-color-danger-rgb, 245,108,108), .12); } }
  .bug-row.sev-致命, .bug-row.sev-严重 { background: rgba(var(--el-color-danger-rgb, 245,108,108), .06); &:hover { background: rgba(var(--el-color-danger-rgb, 245,108,108), .1); } }
  .fab-btn { box-shadow: 0 4px 16px rgba(0,0,0,.35); &:hover { box-shadow: 0 6px 24px rgba(0,0,0,.45); } }
}
</style>
