<template>
  <div class="plan-detail-container">
    <!-- 顶部信息卡片 -->
    <el-card class="info-card">
      <div class="plan-header">
        <div class="plan-info">
          <h3 class="plan-title">{{ plan.name }}</h3>
          <div class="plan-meta">
            <span :class="['status-pill', `pill-${statusKey(plan.status)}`]">
              <span class="pill-dot"></span>{{ plan.status }}
            </span>
            <span v-if="plan.versionName" class="meta-item">
              <el-icon><Files /></el-icon> {{ plan.versionName }}
            </span>
            <span class="meta-item">
              <el-icon><User /></el-icon> {{ plan.creatorName }}
            </span>
            <span class="meta-item">
              <el-icon><Calendar /></el-icon> {{ plan.startDate || '—' }} ~ {{ plan.endDate || '—' }}
            </span>
            <el-button v-if="activeReview" type="success" size="small" @click="goReview(activeReview.id)">
              继续评审 ({{ activeReview.pass_count || 0 }}/{{ activeReview.total_count || 0 }})
            </el-button>
            <el-button v-else type="warning" size="small" plain @click="showCreateReview = true">
              <el-icon><Stamp /></el-icon>发起评审
            </el-button>
            <el-button type="primary" size="small" plain @click="handleGenerateReport">
              <el-icon><DataAnalysis /></el-icon>生成报告
            </el-button>
          </div>
        </div>
        <div class="plan-progress">
          <div class="progress-stats">
            <div class="progress-item success">
              <span class="progress-num">{{ plan.passCount }}</span>
              <span class="progress-label">通过</span>
            </div>
            <div class="progress-item danger">
              <span class="progress-num">{{ plan.failCount }}</span>
              <span class="progress-label">失败</span>
            </div>
            <div class="progress-item warning">
              <span class="progress-num">{{ plan.blockCount }}</span>
              <span class="progress-label">阻塞</span>
            </div>
            <div class="progress-item info">
              <span class="progress-num">{{ plan.pendingCount }}</span>
              <span class="progress-label">未执行</span>
            </div>
          </div>
          <el-progress
            :percentage="calcProgress()"
            :color="progressColor()"
            :stroke-width="10"
            style="width:180px; margin-top:8px"
          />
          <span class="progress-total">共 {{ plan.totalCount }} 条用例</span>
        </div>
      </div>
    </el-card>

    <!-- 用例列表 + 评审记录 -->
    <el-card class="main-card">
      <div class="tab-segmented">
        <el-segmented v-model="detailTab" :options="detailTabOptions" size="default" />
      </div>

      <!-- 用例列表 -->
      <template v-if="detailTab === 'cases'">
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-select v-model="filterResult" placeholder="执行结果" clearable style="width:110px" @change="fetchCases">
            <el-option label="通过" value="通过" />
            <el-option label="失败" value="失败" />
            <el-option label="阻塞" value="阻塞" />
            <el-option label="未执行" value="未执行" />
            <el-option label="跳过" value="跳过" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" plain @click="addCaseDialogVisible = true">
            <el-icon><Plus /></el-icon>添加用例
          </el-button>
          <el-button type="success" plain :disabled="selectedIds.length === 0" @click="handleBatchRun">
            <el-icon><VideoPlay /></el-icon>批量执行
          </el-button>
        </div>
      </div>

      <el-table
        :data="cases"
        style="width:100%"
        row-key="id"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="testcaseTitle" label="用例标题" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="case-title">{{ row.testcaseTitle }}</span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="72" align="center">
          <template #default="{ row }">
            <span :class="['priority-dot', `priority-${row.testcasePriority?.toLowerCase()}`]">
              {{ row.testcasePriority }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="testcaseType" label="类型" width="90" />
        <el-table-column prop="testcaseModule" label="模块" width="130" show-overflow-tooltip />
        <el-table-column label="执行结果" width="140" align="center">
          <template #default="{ row }">
            <el-dropdown trigger="click" placement="bottom-end" popper-class="result-dropdown-popper">
              <span :class="['result-pill', `pill-${resultKey(row.result)}`]">
                <span class="pill-dot"></span>
                <span class="pill-label">{{ row.result }}</span>
                <el-icon class="pill-chevron"><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <div class="result-dropdown">
                  <button
                    v-for="opt in resultDropdownOptions"
                    :key="opt.value"
                    :class="['result-dropdown-item', { active: row.result === opt.value }]"
                    @click="handleQuickRun(row, opt.value)"
                  >
                    <span :class="['rd-dot', `pill-${opt.key}`]"></span>
                    <span class="rd-label">{{ opt.label }}</span>
                    <el-icon v-if="row.result === opt.value" class="rd-check"><CircleCheckFilled /></el-icon>
                  </button>
                </div>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
        <el-table-column label="执行人" width="90">
          <template #default="{ row }">
            <span>{{ row.executorName || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="执行时间" width="160">
          <template #default="{ row }">
            <span class="time-text">{{ row.executedAt || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="handleRunCase(row)">执行</el-button>
            <el-button size="small" link type="danger" @click="handleRemoveCase(row)">移除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <el-icon size="48" style="color: var(--text-placeholder)"><DocumentChecked /></el-icon>
            <p>暂无关联用例</p>
            <el-button type="primary" size="small" :icon="Plus" @click="addCaseDialogVisible = true">
              添加用例
            </el-button>
          </div>
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="totalCases"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="fetchCases"
          @size-change="() => { currentPage = 1; fetchCases(); }"
        />
      </div>
      </template>

      <!-- 评审记录 -->
      <template v-if="detailTab === 'reviews'">
      <div v-if="reviewList.length === 0" class="empty-state">
        <el-icon size="48" style="color: var(--text-placeholder)"><Stamp /></el-icon>
        <p>暂无评审记录</p>
        <el-button type="primary" size="small" :icon="Stamp" @click="showCreateReview = true">发起首次评审</el-button>
      </div>
      <el-table v-else :data="reviewList" style="width:100%" row-key="id" row-class-name="review-row">
        <el-table-column prop="title" label="评审标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="review-name" @click="goReview(row.id)">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="reviewStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="评审进度" width="200">
          <template #default="{ row }">
            <div class="review-progress-cell">
              <el-progress
                :percentage="row.total_count ? Math.round(((row.pass_count + row.reject_count) / row.total_count) * 100) : 0"
                :color="reviewProgressColor(row)"
                :stroke-width="8"
                style="width:100px"
              />
              <span class="review-progress-text">
                通过{{ row.pass_count }} / 驳回{{ row.reject_count }} / 共{{ row.total_count }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="创建人" width="100" />
        <el-table-column label="创建时间" width="155">
          <template #default="{ row }">
            <span class="time-text">{{ row.created_at }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="goReview(row.id)">查看</el-button>
            <el-button size="small" link type="danger" @click="handleDeleteReview(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      </template>
    </el-card>

    <!-- 发起评审弹窗 -->
    <el-dialog v-model="showCreateReview" title="发起评审" width="480px" destroy-on-close>
      <el-form ref="reviewFormRef" :model="reviewForm" :rules="reviewRules" label-width="90px">
        <el-form-item label="评审标题" prop="title">
          <el-input v-model="reviewForm.title" placeholder="例如：v2.1 回归测试评审" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="关联计划">
          <el-input :model-value="plan.name" disabled />
        </el-form-item>
        <el-form-item label="用例数量">
          <span class="review-case-count">{{ plan.totalCount || 0 }} 条用例</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateReview = false">取消</el-button>
        <el-button type="primary" :loading="createReviewLoading" @click="handleCreateReview">发起评审</el-button>
      </template>
    </el-dialog>

    <!-- 添加用例弹窗 -->
    <el-dialog v-model="addCaseDialogVisible" title="添加用例到计划" width="750px" destroy-on-close>
      <div style="margin-bottom:12px; display:flex; gap:12px; align-items:center">
        <el-input
          v-model="caseSearchTitle"
          placeholder="搜索用例标题..."
          clearable
          style="width:220px"
          @input="debounceCaseSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <ModernSelect
          v-model="caseVersionFilter"
          :options="versionFilterOptions"
          placeholder="关联版本"
          clearable
          style="width:180px"
          @change="() => { casePage = 1; fetchAvailableCases(); }"
        />
      </div>
      <el-table
        ref="caseTableRef"
        :data="availableCases"
        style="width:100%"
        row-key="id"
        @selection-change="onCaseSelectionChange"
        max-height="400"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="title" label="用例标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="优先级" width="72" align="center">
          <template #default="{ row }">
            <span :class="['priority-dot', `priority-${row.priority?.toLowerCase()}`]">{{ row.priority }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="90" />
        <el-table-column prop="module" label="模块" width="130" show-overflow-tooltip />
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="casePage"
          v-model:page-size="casePageSize"
          :total="caseTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          small
          @current-change="fetchAvailableCases"
          @size-change="() => { casePage = 1; fetchAvailableCases(); }"
        />
      </div>
      <template #footer>
        <el-button @click="addCaseDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addLoading" @click="handleAddCases">
          添加 ({{ selectedCaseIds.length }})
        </el-button>
      </template>
    </el-dialog>

    <!-- 执行用例抽屉 -->
    <TestcaseRunDialog
      v-model:visible="runDialogVisible"
      :run-case="runCase"
      :run-steps="runSteps"
      :plan-id="planId"
      :plan-case-id="planCaseIdForRun"
      @done="handleRunDone"
      @submit-bug-from-step="handleSubmitBugFromStep"
      @submit-bug-from-run="handleSubmitBugFromRun"
    />

    <!-- 提交 Bug 弹窗 -->
    <TestcaseBugDialog
      v-model:visible="bugDialogVisible"
      :initial-form="bugInitialForm"
      :run-case-id="runCase?.id || null"
      :user-options="userOptions"
      @saved="fetchCases"
    />

    <!-- ═══ 测试报告弹窗 ═══ -->
    <el-dialog
      v-model="reportVisible"
      :title="false"
      width="960px"
      destroy-on-close
      class="test-report-dialog"
    >
      <template #header>
        <div class="report-hero">
          <div class="report-hero__title-row">
            <span class="report-hero__icon">
              <el-icon :size="22"><DataAnalysis /></el-icon>
            </span>
            <span class="report-hero__name">测试报告</span>
            <el-tag size="default" effect="dark" round>{{ reportData?.plan?.name }}</el-tag>
            <el-button type="success" size="small" plain @click="handleCopyMarkdown">
              <el-icon><CopyDocument /></el-icon>复制 Markdown
            </el-button>
          </div>
          <div class="report-hero__meta" v-if="reportData?.plan">
            <span v-if="reportData.plan.version_name" class="report-meta-item">
              <el-icon><Files /></el-icon>{{ reportData.plan.version_name }}
            </span>
            <span class="report-meta-item">
              <el-icon><User /></el-icon>{{ reportData.plan.creator_name }}
            </span>
            <span class="report-meta-item">
              <el-icon><Calendar /></el-icon>{{ reportData.plan.start_date || '—' }} ~ {{ reportData.plan.end_date || '—' }}
            </span>
          </div>
        </div>
      </template>

      <div v-if="reportData" class="report-body">
        <!-- ═══ KPI 统计卡 ═══ -->
        <div class="report-kpi-grid">
          <div class="report-kpi">
            <div class="report-kpi__icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
              <el-icon :size="18"><DocumentChecked /></el-icon>
            </div>
            <div class="report-kpi__body">
              <span class="report-kpi__value">{{ reportData.case_stats.total }}</span>
              <span class="report-kpi__label">总用例数</span>
            </div>
          </div>
          <div class="report-kpi">
            <div class="report-kpi__icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)">
              <el-icon :size="18"><VideoPlay /></el-icon>
            </div>
            <div class="report-kpi__body">
              <span class="report-kpi__value">{{ reportData.case_stats.executed }}</span>
              <span class="report-kpi__label">已执行</span>
            </div>
          </div>
          <div class="report-kpi success">
            <div class="report-kpi__icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7)">
              <el-icon :size="18"><CircleCheckFilled /></el-icon>
            </div>
            <div class="report-kpi__body">
              <span class="report-kpi__value">{{ reportData.case_stats.passed }}</span>
              <span class="report-kpi__label">通过</span>
            </div>
          </div>
          <div class="report-kpi danger">
            <div class="report-kpi__icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
              <el-icon :size="18"><CircleCloseFilled /></el-icon>
            </div>
            <div class="report-kpi__body">
              <span class="report-kpi__value">{{ reportData.case_stats.failed }}</span>
              <span class="report-kpi__label">失败</span>
            </div>
          </div>
          <div class="report-kpi warning">
            <div class="report-kpi__icon" style="background: linear-gradient(135deg, #fa709a, #fee140)">
              <el-icon :size="18"><WarningFilled /></el-icon>
            </div>
            <div class="report-kpi__body">
              <span class="report-kpi__value">{{ reportData.case_stats.blocked }}</span>
              <span class="report-kpi__label">阻塞</span>
            </div>
          </div>
          <div class="report-kpi bug-kpi">
            <div class="report-kpi__icon" style="background: linear-gradient(135deg, #e74c3c, #c0392b)">
              <el-icon :size="18"><WarningFilled /></el-icon>
            </div>
            <div class="report-kpi__body">
              <span class="report-kpi__value">{{ reportData.bug_stats.total }}</span>
              <span class="report-kpi__label">Bug 总数</span>
            </div>
          </div>
        </div>

        <!-- ═══ 通过率 + 进度条 ═══ -->
        <div class="report-rate-section" v-if="reportData.case_stats.total > 0">
          <div class="report-rate-ring">
            <svg viewBox="0 0 100 100" class="rate-ring-svg">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--bg-hover)" stroke-width="6" />
              <circle
                cx="50" cy="50" r="38" fill="none"
                :stroke="rateColor(reportData.case_stats.pass_rate)"
                stroke-width="6" stroke-linecap="round"
                :stroke-dasharray="2 * Math.PI * 38"
                :stroke-dashoffset="2 * Math.PI * 38 * (1 - reportData.case_stats.pass_rate / 100)"
                transform="rotate(-90 50 50)" class="rate-ring-fill"
              />
            </svg>
            <div class="rate-ring-text">
              <span class="rate-ring-text__value">{{ reportData.case_stats.pass_rate }}%</span>
              <span class="rate-ring-text__label">通过率</span>
            </div>
          </div>
          <div class="report-rate-bars">
            <div class="report-bar">
              <span class="report-bar__label">执行率</span>
              <div class="report-bar__track">
                <div class="report-bar__fill" :style="{ width: reportData.case_stats.exec_rate + '%', background: 'var(--el-color-primary)' }" />
              </div>
              <span class="report-bar__pct">{{ reportData.case_stats.exec_rate }}%</span>
            </div>
            <div class="report-bar">
              <span class="report-bar__label">通过率</span>
              <div class="report-bar__track">
                <div class="report-bar__fill" :style="{ width: reportData.case_stats.pass_rate + '%', background: rateColor(reportData.case_stats.pass_rate) }" />
              </div>
              <span class="report-bar__pct">{{ reportData.case_stats.pass_rate }}%</span>
            </div>
          </div>
        </div>

        <!-- ═══ 失败用例 + 关联 Bug ═══ -->
        <div v-if="reportData.failed_cases.length > 0" class="report-section">
          <h4 class="report-section__title">
            <el-icon :size="16"><CircleCloseFilled /></el-icon>失败用例 ({{ reportData.failed_cases.length }})
          </h4>
          <div class="failed-case-list">
            <div v-for="fc in reportData.failed_cases" :key="fc.case_id" class="failed-case-item">
              <div class="failed-case__main">
                <span class="failed-case__title">{{ fc.title }}</span>
                <span class="failed-case__meta">
                  <span v-if="fc.executor_name" class="failed-case__executor">{{ fc.executor_name }}</span>
                  <span v-if="fc.remark" class="failed-case__remark">{{ fc.remark }}</span>
                </span>
              </div>
              <div v-if="fc.bugs.length > 0" class="failed-case__bugs">
                <el-tag
                  v-for="bug in fc.bugs" :key="bug.id"
                  :type="bugSeverityTagType(bug.severity)"
                  size="small"
                  class="bug-link-tag"
                  @click="openBug(bug.id)"
                >{{ bug.severity }} · {{ bug.title }}</el-tag>
              </div>
              <span v-else class="failed-case__no-bug">暂无关联Bug</span>
            </div>
          </div>
        </div>

        <!-- ═══ Bug 列表 ═══ -->
        <div v-if="reportData.bugs.length > 0" class="report-section">
          <h4 class="report-section__title">
            <el-icon :size="16"><WarningFilled /></el-icon>Bug 列表 ({{ reportData.bugs.length }})
          </h4>
          <div class="bug-mini-list">
            <div
              v-for="bug in reportData.bugs" :key="bug.id"
              class="bug-mini-row"
              @click="openBug(bug.id)"
            >
              <span class="bug-mini-row__dot" :class="'sev-' + bug.severity"></span>
              <span class="bug-mini-row__title">{{ bug.title }}</span>
              <el-tag :type="bugStatusTagType(bug.status)" size="small" effect="plain">{{ bug.status }}</el-tag>
              <span class="bug-mini-row__assignee" v-if="bug.assignee__first_name">
                <el-icon :size="12"><User /></el-icon>{{ bug.assignee__first_name }}
              </span>
            </div>
          </div>
        </div>

        <!-- ═══ 空状态 ═══ -->
        <div v-if="reportData.case_stats.total === 0" class="report-empty">
          <el-icon :size="48" style="color: var(--text-placeholder)"><DocumentChecked /></el-icon>
          <p>该计划暂无用例，无法生成报告</p>
        </div>
      </div>

      <div v-else class="report-loading" v-loading="reportLoading">
        <p>正在生成报告...</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, computed, onMounted, watch
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search, Plus, Calendar, User, Files, VideoPlay, ArrowDown, DocumentChecked, Stamp,
  InfoFilled, Aim, Warning, CircleCheckFilled, CircleCloseFilled, WarningFilled, RemoveFilled, CopyDocument,
  DataAnalysis,
} from '@element-plus/icons-vue';
import {
  getTestPlanDetail, getTestPlanCases, addTestPlanCases,
  updateTestPlanCase, removeTestPlanCase, getTestcaseList,
  createReview, getReviewList, deleteReview,
  getTestPlanReport, getTestPlanReportMarkdown,
} from '@/api/testcase';
import { getUserList } from '@/api/user';
import { getVersionList } from '@/api/version';
import { setPageTitle } from '@/composables/usePageTitle';
import ModernSelect from '@/components/ModernSelect.vue';
import TestcaseRunDialog from './components/TestcaseRunDialog.vue';
import TestcaseBugDialog from './components/TestcaseBugDialog.vue';

const route = useRoute();
const router = useRouter();
const planId = computed(() => route.params.id);

// ── 用户列表（提交 Bug 用）────────────────────────────────────
const userOptions = ref([]);

const fetchUsers = async () => {
  try {
    const res = await getUserList();
    userOptions.value = (res.data || []).map((u: any) => ({
      id: u.id,
      label: u.first_name || u.username,
      avatar: u.avatar || '',
      dept: u.dept || '',
    }));
  } catch { /* ignore */ }
};

// ── Tab 切换 ──────────────────────────────────────────────────
const detailTab = ref('cases');
const detailTabOptions = [
  { label: '用例列表', value: 'cases' },
  { label: '评审记录', value: 'reviews' },
];

// ── 计划信息 ──────────────────────────────────────────────────
const plan = ref({
  name: '',
  status: '',
  creatorName: '',
  versionName: '',
  startDate: '',
  endDate: '',
  totalCount: 0,
  passCount: 0,
  failCount: 0,
  blockCount: 0,
  skipCount: 0,
  pendingCount: 0,
});

const fetchPlan = async () => {
  try {
    const res = await getTestPlanDetail(planId.value);
    const found = res.data;
    if (found) {
      plan.value = {
        ...found,
        creatorName: found.creator_name || '',
        versionName: found.version_name || '',
        startDate: found.start_date || '',
        endDate: found.end_date || '',
        totalCount: found.total_count || 0,
        passCount: found.pass_count || 0,
        failCount: found.fail_count || 0,
        blockCount: found.block_count || 0,
        skipCount: found.skip_count || 0,
        pendingCount: found.pending_count || 0,
      };
      // 更新便签栏动态标题
      setPageTitle(route.path, `测试计划详情 - ${found.name || ''}`);
    }
  } catch { /* ignore */ }
};

// ── 用例列表 ──────────────────────────────────────────────────
const cases = ref([]);
const totalCases = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterResult = ref('');

const fetchCases = async () => {
  try {
    const params = { page: currentPage.value, pageSize: pageSize.value };
    if (filterResult.value) params.result = filterResult.value;
    const res = await getTestPlanCases(planId.value, params);
    cases.value = (res.data.list || []).map((c) => ({
      ...c,
      testcaseTitle: c.testcase_title || '',
      testcasePriority: c.testcase_priority || '',
      testcaseType: c.testcase_type || '',
      testcaseModule: c.testcase_module || '',
      testcasePrecondition: c.testcase_precondition || '',
      testcaseSteps: c.testcase_steps || [],
      testcaseId: c.testcase || null,
      executorName: c.executor_name || '',
      executedAt: c.executed_at || '',
      result: c.result || '未执行',
    }));
    totalCases.value = res.data.total || 0;
  } catch { /* ignore */ }
};

// ── 工具函数 ──────────────────────────────────────────────────
const statusKey = (s) => {
  const map = { 未开始: 'pending', 进行中: 'active', 已完成: 'done', 已关闭: 'closed' };
  return map[s] || 'pending';
};

const calcProgress = () => {
  if (!plan.value.totalCount) return 0;
  return Math.round((plan.value.passCount / plan.value.totalCount) * 100);
};

const progressColor = () => {
  if (!plan.value.totalCount) return 'var(--text-secondary)';
  const rate = Math.round((plan.value.passCount / plan.value.totalCount) * 100);
  if (rate >= 90) return 'var(--el-color-success)';
  if (rate >= 70) return 'var(--el-color-primary)';
  return 'var(--el-color-danger)';
};

// ── 选择 ──────────────────────────────────────────────────────
const selectedIds = ref([]);
const onSelectionChange = (rows) => { selectedIds.value = rows.map((r) => r.id); };

// ── 快速执行 ──────────────────────────────────────────────────
const handleQuickRun = async (row, result) => {
  try {
    await updateTestPlanCase(planId.value, row.id, { result });
    ElMessage.success('执行完成');
    fetchCases();
    fetchPlan();
  } catch { /* ignore */ }
};

// ── 执行弹窗 ──────────────────────────────────────────────────
const runDialogVisible = ref(false);
const runCase = ref(null);
const runSteps = ref([]);
const planCaseIdForRun = ref(null);

const handleRunCase = (row) => {
  planCaseIdForRun.value = row.id;
  runCase.value = {
    id: row.testcaseId,
    title: row.testcaseTitle,
    precondition: row.testcasePrecondition,
  };
  runSteps.value = (row.testcaseSteps || []).map((s) => ({
    desc: s.desc,
    expect: s.expect,
    actual: '',
    result: '',
  }));
  runDialogVisible.value = true;
};

const handleRunDone = () => {
  runDialogVisible.value = false;
  fetchCases();
  fetchPlan();
};

// ── 提交 Bug ──────────────────────────────────────────────────
const bugDialogVisible = ref(false);
const bugInitialForm = ref(null);

const buildStepsText = (failedIndexes = []) => {
  if (!runCase.value) return '';
  const lines = [`[用例] ${runCase.value.title}`];
  if (runCase.value.precondition) lines.push(`[前置条件] ${runCase.value.precondition}`);
  lines.push('', '[重现步骤]');
  runSteps.value.forEach((step, i) => {
    lines.push(`步骤${i + 1}: ${step.desc}`, `  预期: ${step.expect}`);
    if (step.actual) lines.push(`  实际: ${step.actual}`);
    if (failedIndexes.includes(i)) lines.push('  >>> 此步骤执行失败 <<<');
  });
  return lines.join('\n');
};

const handleSubmitBugFromStep = (stepIndex) => {
  const step = runSteps.value[stepIndex];
  bugInitialForm.value = {
    title: `[用例#${runCase.value.id}] 步骤${stepIndex + 1}失败: ${step.desc}`,
    stepsToReproduce: buildStepsText([stepIndex]),
  };
  bugDialogVisible.value = true;
};

const handleSubmitBugFromRun = () => {
  const failedIndexes = runSteps.value.reduce((acc, s, i) => { if (s.result === '失败') acc.push(i); return acc; }, []);
  bugInitialForm.value = {
    title: `[用例#${runCase.value.id}] ${runCase.value.title} - 执行失败`,
    stepsToReproduce: buildStepsText(failedIndexes),
  };
  bugDialogVisible.value = true;
};

// ── 批量执行 ──────────────────────────────────────────────────
const handleBatchRun = () => {
  const selected = cases.value.filter((c) => selectedIds.value.includes(c.id));
  if (!selected.length) return;
  ElMessageBox.confirm(`确定批量将选中的 ${selected.length} 条用例标记为通过？`, '批量执行', { type: 'info' })
    .then(async () => {
      await Promise.all(selected.map((c) => updateTestPlanCase(planId.value, c.id, { result: '通过' })));
      ElMessage.success('批量执行完成');
      selectedIds.value = [];
      fetchCases();
      fetchPlan();
    })
    .catch(() => {});
};

// ── 移除用例 ──────────────────────────────────────────────────
const handleRemoveCase = (row) => {
  ElMessageBox.confirm(`确定从计划中移除用例「${row.testcaseTitle}」？`, '提示', { type: 'warning' })
    .then(async () => {
      await removeTestPlanCase(planId.value, row.id);
      ElMessage.success('已移除');
      fetchCases();
      fetchPlan();
    })
    .catch(() => {});
};

// ── 添加用例 ──────────────────────────────────────────────────
const addCaseDialogVisible = ref(false);
const caseTableRef = ref(null);
const availableCases = ref([]);
const caseTotal = ref(0);
const casePage = ref(1);
const casePageSize = ref(10);
const caseSearchTitle = ref('');
const caseVersionFilter = ref(null);
const selectedCaseIds = ref([]);
const addLoading = ref(false);

// 版本筛选选项
const versionFilterOptions = ref<{ label: string; value: number }[]>([]);

const fetchVersionOptions = async () => {
  try {
    const res = await getVersionList({ page: 1, pageSize: 999 });
    versionFilterOptions.value = (res.data.list || []).map((v: any) => ({
      label: v.name,
      value: v.id,
    }));
  } catch { /* ignore */ }
};

let caseSearchTimer = null;
function debounceCaseSearch() {
  clearTimeout(caseSearchTimer);
  caseSearchTimer = setTimeout(() => { casePage.value = 1; fetchAvailableCases(); }, 300);
}

const fetchAvailableCases = async () => {
  try {
    const params: any = { page: casePage.value, pageSize: casePageSize.value, exclude_plan: planId.value };
    if (caseSearchTitle.value) params.title = caseSearchTitle.value;
    if (caseVersionFilter.value) params.version = caseVersionFilter.value;
    const res = await getTestcaseList(params);
    availableCases.value = (res.data.list || []).map((tc) => ({
      ...tc,
      module: tc.module || '',
    }));
    caseTotal.value = res.data.total || 0;
  } catch { /* ignore */ }
};

const onCaseSelectionChange = (rows) => { selectedCaseIds.value = rows.map((r) => r.id); };

const handleAddCases = async () => {
  if (!selectedCaseIds.value.length) { ElMessage.warning('请选择要添加的用例'); return; }
  addLoading.value = true;
  try {
    await addTestPlanCases(planId.value, { testcase_ids: selectedCaseIds.value });
    ElMessage.success('添加成功');
    addCaseDialogVisible.value = false;
    selectedCaseIds.value = [];
    fetchCases();
    fetchPlan();
  } catch { ElMessage.error('添加失败'); } finally { addLoading.value = false; }
};

// ── 监听弹窗打开时加载数据 ─────────────────────────────────────
watch(addCaseDialogVisible, (val) => {
  if (val) {
    caseSearchTitle.value = '';
    caseVersionFilter.value = null;
    casePage.value = 1;
    selectedCaseIds.value = [];
    fetchVersionOptions();
    fetchAvailableCases();
  }
});

// ── 评审 ──────────────────────────────────────────────────────
const reviewList = ref([]);
const activeReview = ref(null);
const showCreateReview = ref(false);
const createReviewLoading = ref(false);
const reviewFormRef = ref(null);
const reviewForm = ref({
  title: '',
});
const reviewRules = {
  title: [{ required: true, message: '请输入评审标题', trigger: 'blur' }],
};

const fetchReviews = async () => {
  try {
    const res = await getReviewList({ plan_id: planId.value });
    reviewList.value = (res.data.list || []).map((r) => ({
      ...r,
      pass_count: r.pass_count || 0,
      reject_count: r.reject_count || 0,
      total_count: r.total_count || 0,
      pending_count: r.pending_count || 0,
      creator_name: r.creator_name || '',
      created_at: r.created_at || '',
    }));
    activeReview.value = reviewList.value.find((r) => r.status === '进行中') || null;
  } catch { /* ignore */ }
};

const goReview = (id) => {
  router.push(`/test/review/${id}`);
};

const handleCreateReview = async () => {
  if (!reviewFormRef.value) return;
  try {
    await reviewFormRef.value.validate();
  } catch {
    return;
  }
  createReviewLoading.value = true;
  try {
    const res = await createReview({
      plan: planId.value,
      title: reviewForm.value.title,
    });
    ElMessage.success('评审已创建');
    showCreateReview.value = false;
    reviewForm.value.title = '';
    await fetchReviews();
    // 直接进入评审
    const reviewId = res.data?.id;
    if (reviewId) router.push(`/test/review/${reviewId}`);
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '创建失败');
  } finally {
    createReviewLoading.value = false;
  }
};

const handleDeleteReview = (row) => {
  ElMessageBox.confirm(`确定删除评审「${row.title}」？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteReview(row.id);
      ElMessage.success('已删除');
      fetchReviews();
    })
    .catch(() => {});
};

const reviewStatusType = (s) => {
  const map = { 进行中: '', 已完成: 'success', 已取消: 'info' };
  return map[s] || 'info';
};

const reviewProgressColor = (row) => {
  if (!row.total_count) return 'var(--text-secondary)';
  if (row.reject_count > 0) return 'var(--el-color-warning)';
  if ((row.pass_count + row.reject_count) === row.total_count) return 'var(--el-color-success)';
  return 'var(--el-color-primary)';
};

// ── 测试报告 ──────────────────────────────────────────────────
const reportVisible = ref(false);
const reportLoading = ref(false);
const reportData = ref(null);

const handleGenerateReport = async () => {
  reportVisible.value = true;
  reportLoading.value = true;
  reportData.value = null;
  try {
    const res = await getTestPlanReport(planId.value);
    reportData.value = res.data;
  } catch {
    ElMessage.error('生成报告失败');
    reportVisible.value = false;
  } finally {
    reportLoading.value = false;
  }
};

const rateColor = (p: number) => {
  if (p >= 90) return 'var(--el-color-success)';
  if (p >= 60) return 'var(--el-color-warning)';
  return 'var(--el-color-danger)';
};

const bugSeverityTagType = (s: string) => ({
  致命: 'danger', 严重: 'warning', 一般: 'primary', 轻微: 'info', 建议: '',
}[s] || 'info');

const bugStatusTagType = (s: string) => ({
  待处理: 'info', 处理中: 'warning', 已解决: 'success', 已关闭: '', 已拒绝: 'danger', 激活: 'primary',
}[s] || 'info');

const openBug = (bugId: number) => {
  router.push({ path: '/test/bug', query: { openId: bugId } });
};

const handleCopyMarkdown = async () => {
  try {
    const res = await getTestPlanReportMarkdown(planId.value);
    const md = res.data?.markdown || '';
    if (md) {
      await navigator.clipboard.writeText(md);
      ElMessage.success('Markdown 已复制到剪贴板，可直接粘贴到飞书');
    } else {
      ElMessage.warning('暂无报告内容');
    }
  } catch {
    ElMessage.error('获取 Markdown 失败');
  }
};

onMounted(() => { fetchPlan(); fetchCases(); fetchReviews(); fetchUsers(); });

// 监听路由参数变化（同路由切换不同计划时重新加载）
watch(planId, () => {
  currentPage.value = 1;
  filterResult.value = '';
  detailTab.value = 'cases';
  fetchPlan();
  fetchCases();
  fetchReviews();
});

const resultKey = (r) => {
  const map = { 通过: 'pass', 失败: 'fail', 阻塞: 'block', 跳过: 'skip' };
  return map[r] || 'pending';
};

const resultDropdownOptions = [
  { label: '通过', value: '通过', key: 'pass' },
  { label: '失败', value: '失败', key: 'fail' },
  { label: '阻塞', value: '阻塞', key: 'block' },
  { label: '跳过', value: '跳过', key: 'skip' },
];

</script>

<style scoped lang="scss">
.plan-detail-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// ── 顶部信息卡 ────────────────────────────────────────────────
.info-card {
  border-radius: 16px;
  border: 1px solid var(--border-light);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 20px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, var(--el-color-primary), rgba(102, 126, 234, 0.3));
    border-radius: 0 2px 2px 0;
  }
  :deep(.el-card__body) { padding: 24px; }
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 28px;
}

.plan-info {
  flex: 1;

  .plan-title {
    margin: 0 0 12px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }

  .plan-meta {
    display: flex;
    align-items: center;
    gap: 18px;
    font-size: 13px;
    color: var(--text-regular);
    flex-wrap: wrap;

    .meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
  }
}

.plan-progress {
  text-align: center;
  flex-shrink: 0;

  .progress-stats {
    display: flex;
    gap: 18px;
  }

  .progress-item {
    text-align: center;
    min-width: 40px;

    .progress-num { display: block; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .progress-label { font-size: 11px; color: var(--text-secondary); font-weight: 500; margin-top: 2px; }

    &.success .progress-num { color: var(--el-color-success); }
    &.danger .progress-num { color: var(--el-color-danger); }
    &.warning .progress-num { color: var(--el-color-warning); }
    &.info .progress-num { color: var(--text-secondary); }
  }

  .progress-total {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 6px;
    display: block;
    font-weight: 500;
  }
}

// ── 状态胶囊 ──────────────────────────────────────────────
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 8px 0 6px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 550;
  user-select: none;
  white-space: nowrap;

  .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  &.pill-pending {
    background: transparent;
    color: var(--text-placeholder);
    border: 1px solid var(--border-color);
    .pill-dot { background: var(--border-heavy); }
  }
  &.pill-active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    .pill-dot { background: var(--el-color-primary); }
  }
  &.pill-done {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
    .pill-dot { background: var(--el-color-success); }
  }
  &.pill-closed {
    background: var(--bg-hover);
    color: var(--text-secondary);
    .pill-dot { background: var(--text-secondary); }
  }
}

.tab-segmented {
  margin-bottom: 16px;
}

// ── 主卡片 ────────────────────────────────────────────────────
.main-card {
  border-radius: 16px;
  border: 1px solid var(--border-light);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 20px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  :deep(.el-card__body) { padding: 20px 24px; }
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-light);

  .toolbar-left  { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .toolbar-right { display: flex; gap: 10px; align-items: center; }
}

// ── 表格 ──────────────────────────────────────────────────────
:deep(.el-table) {
  --el-table-border-color: transparent;

  th.el-table__cell {
    background: var(--bg-elevated);
    font-weight: 600;
    font-size: 12px;
    color: var(--text-secondary);
    letter-spacing: 0.3px;
    border-bottom: 1px solid var(--border-light);
  }

  .el-table__body tr:hover > td {
    background: var(--bg-hover) !important;
  }
}

.case-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.priority-dot {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;

  &.priority-p0 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.priority-p1 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.priority-p2 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.priority-p3 { background: var(--el-color-success-light-9); color: var(--el-color-success); }
}

.time-text { font-size: 13px; color: var(--text-secondary); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 56px 0;
  color: var(--text-secondary);

  .el-icon { opacity: 0.5; }
  p { margin: 0; font-size: 15px; font-weight: 500; color: var(--text-placeholder); }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
}

// ── 评审 ────────────────────────────────────────────────────
.review-name {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease;
  &:hover { color: var(--el-color-primary); }
}

:deep(.review-row) { cursor: pointer; }

.review-progress-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.review-progress-text {
  font-size: 13px;
  color: var(--text-regular);
  white-space: nowrap;
}

.review-case-count {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-color-primary);
  letter-spacing: -0.2px;
}

// ── 执行结果胶囊 ──────────────────────────────────────────────
.result-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px 0 7px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 550;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition:
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.2s ease,
    background 0.2s ease;
  position: relative;

  .pill-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .pill-chevron {
    font-size: 10px;
    opacity: 0.5;
    transition: opacity 0.15s ease;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    .pill-chevron {
      opacity: 0.8;
    }
  }

  &:active {
    transform: scale(0.96);
  }

  // ── 通过 ──
  &.pill-pass {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);

    .pill-dot { background: var(--el-color-success); }
    &:hover { box-shadow: 0 2px 10px rgba(103, 194, 58, 0.18); }
  }

  // ── 失败 ──
  &.pill-fail {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);

    .pill-dot { background: var(--el-color-danger); }
    &:hover { box-shadow: 0 2px 10px rgba(245, 108, 108, 0.18); }
  }

  // ── 阻塞 ──
  &.pill-block {
    background: var(--el-color-warning-light-9);
    color: var(--el-color-warning);

    .pill-dot { background: var(--el-color-warning); }
    &:hover { box-shadow: 0 2px 10px rgba(230, 162, 60, 0.18); }
  }

  // ── 跳过 ──
  &.pill-skip {
    background: var(--bg-hover);
    color: var(--text-secondary);

    .pill-dot { background: var(--text-secondary); }
  }

  // ── 未执行 ──
  &.pill-pending {
    background: transparent;
    color: var(--text-placeholder);
    border: 1px solid var(--border-color);

    .pill-dot { background: var(--border-heavy); }
  }
}

// ── 下拉菜单 popper 全局样式 ──
.result-dropdown {
  min-width: 130px;
  padding: 4px;
  background: var(--bg-elevated);
  border-radius: 12px;
  box-shadow: var(--shadow-dropdown);
  border: 1px solid var(--border-light);
  backdrop-filter: blur(12px);
  overflow: hidden;
}

.result-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  color: var(--text-regular);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;

  .rd-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .rd-label { flex: 1; text-align: left; }

  .rd-check {
    font-size: 14px;
    color: var(--el-color-primary);
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover {
    background: var(--bg-hover);
  }

  &.active {
    background: var(--bg-active);
    color: var(--text-primary);
    font-weight: 500;

    .rd-check {
      opacity: 1;
      transform: scale(1);
    }
    .rd-dot { opacity: 1; }
  }
}

// ── popper 全局覆盖（需无 scoped 穿透） ──

// ── 测试报告弹窗 ──────────────────────────────────────────────
.test-report-dialog {
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

.report-hero {
  padding: 24px 32px 20px;
  background:
    radial-gradient(ellipse 80% 120% at 85% 0%, rgba(64, 158, 255, 0.06), transparent 60%),
    radial-gradient(ellipse 60% 100% at 15% 100%, rgba(103, 194, 58, 0.05), transparent 60%),
    var(--bg-card);
  border-bottom: 1px solid var(--border-light);

  &__title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  &__icon {
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-5));
    color: #fff;
  }
  &__name {
    font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px;
  }
  &__meta {
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  }
}

.report-meta-item {
  display: flex; align-items: center; gap: 4px;
  font-size: 13px; color: var(--text-secondary);
}

.report-body {
  padding: 24px 32px 32px;
  display: flex; flex-direction: column; gap: 24px;
  max-height: 65vh; overflow-y: auto;
}

.report-kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

.report-kpi {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  &:hover { transform: translateY(-2px); }

  &.success { box-shadow: 0 1px 3px rgba(103, 194, 58, 0.08), var(--shadow-card); }
  &.danger { box-shadow: 0 1px 3px rgba(245, 108, 108, 0.08), var(--shadow-card); }
  &.warning { box-shadow: 0 1px 3px rgba(230, 162, 60, 0.08), var(--shadow-card); }
  &.bug-kpi { box-shadow: 0 1px 3px rgba(231, 76, 60, 0.1), var(--shadow-card); }

  &__icon {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: #fff;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
  }
  &__body { flex: 1; min-width: 0; }
  &__value { display: block; font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1.1; }
  &__label { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 2px; font-weight: 500; }
}

.report-rate-section {
  display: flex; align-items: center; gap: 40px;
  padding: 20px 24px;
  background: var(--bg-card);
  border-radius: 14px;
  border: 1px solid var(--border-light);
}

.report-rate-ring {
  position: relative; width: 96px; height: 96px; flex-shrink: 0;
  .rate-ring-svg { width: 100%; height: 100%; }
  .rate-ring-fill { transition: stroke-dashoffset 0.8s cubic-bezier(.34, 1.56, .64, 1); }
}
.rate-ring-text {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  &__value { font-size: 20px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; line-height: 1; }
  &__label { font-size: 10px; color: var(--text-secondary); margin-top: 2px; font-weight: 500; }
}

.report-rate-bars {
  flex: 1; display: flex; flex-direction: column; gap: 14px;
}
.report-bar {
  display: flex; align-items: center; gap: 12px;
  &__label { font-size: 12px; font-weight: 600; color: var(--text-secondary); min-width: 48px; }
  &__track { flex: 1; height: 8px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; }
  &__fill { height: 100%; border-radius: 4px; transition: width 0.6s cubic-bezier(.34, 1.56, .64, 1); }
  &__pct { font-size: 13px; font-weight: 700; color: var(--text-primary); min-width: 36px; text-align: right; }
}

.report-section {
  &__title {
    display: flex; align-items: center; gap: 6px;
    margin: 0 0 12px;
    font-size: 14px; font-weight: 650; color: var(--text-primary);
  }
}

.failed-case-list {
  display: flex; flex-direction: column; gap: 8px;
}
.failed-case-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-color-danger-light-9);
  border-radius: 10px;
  gap: 16px; flex-wrap: wrap;
}
.failed-case__main {
  display: flex; flex-direction: column; gap: 3px; min-width: 0;
}
.failed-case__title {
  font-size: 14px; font-weight: 600; color: var(--el-color-danger);
}
.failed-case__meta {
  display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-secondary);
}
.failed-case__bugs {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.bug-link-tag {
  cursor: pointer;
  transition: transform 0.15s;
  &:hover { transform: scale(1.04); }
}
.failed-case__no-bug {
  font-size: 12px; color: var(--text-placeholder); white-space: nowrap;
}

.bug-mini-list {
  display: flex; flex-direction: column; gap: 4px;
}
.bug-mini-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  background: var(--bg-hover);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: var(--bg-active); }

  &__dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    &.sev-致命 { background: var(--el-color-danger); }
    &.sev-严重 { background: var(--el-color-warning); }
    &.sev-一般 { background: var(--el-color-primary); }
    &.sev-轻微 { background: var(--el-color-success); }
    &.sev-建议 { background: var(--text-secondary); }
  }
  &__title {
    flex: 1; font-size: 13px; color: var(--text-primary);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  &__assignee {
    font-size: 12px; color: var(--text-secondary);
    display: flex; align-items: center; gap: 3px; white-space: nowrap;
  }
}

.report-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 40px 0; gap: 10px;
  p { color: var(--text-secondary); font-size: 14px; margin: 0; }
}

.report-loading {
  display: flex; align-items: center; justify-content: center;
  height: 200px;
  p { color: var(--text-secondary); font-size: 14px; }
}

@media (max-width: 900px) {
  .report-kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 600px) {
  .report-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .report-rate-section { flex-direction: column; gap: 20px; align-items: center; }
}

</style>

<style lang="scss">
/* 执行结果下拉 popper（渲染在 body 下，需非 scoped） */
.result-dropdown-popper {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;

  .el-dropdown-menu {
    display: none;
  }
}
</style>
