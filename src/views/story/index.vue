<template>
  <div class="story-container">
    <!-- 页头：标题 + 统计 -->
    <div class="page-header">
      <div class="page-title">
        <span class="title-text">需求列表</span>
        <span class="total-badge">共 {{ total }} 条</span>
      </div>
      <div class="stats-group">
        <!-- 开发状态 -->
        <div class="stats-row">
          <span class="stats-label">开发</span>
          <span
            v-for="s in statusStats"
            :key="s.label"
            class="stat-item"
            :class="'stat-' + s.key"
            @click="filterByStatus(s.value)"
          >
            <span class="stat-dot" />
            <span class="stat-label">{{ s.label }}</span>
            <span class="stat-count">{{ s.count }}</span>
          </span>
        </div>
        <!-- 审核状态 -->
        <div class="stats-row">
          <span class="stats-label">审核</span>
          <span
            v-for="s in reviewStats"
            :key="s.label"
            class="stat-item"
            :class="'stat-review-' + s.key"
            @click="filterByReview(s.value)"
          >
            <span class="stat-dot" />
            <span class="stat-label">{{ s.label }}</span>
            <span class="stat-count">{{ s.count }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 视图 Tab 切换 -->
    <div class="view-tabs">
      <el-tabs v-model="currentView" @tab-change="handleViewChange">
        <el-tab-pane label="全部需求" name="all" />
        <el-tab-pane name="pool">
          <template #label>
            <span class="tab-label">
              需求池
              <el-tag size="small" type="warning" class="tab-badge">{{ poolTotal }}</el-tag>
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="dev">
          <template #label>
            <span class="tab-label">
              研发队列
              <el-tag size="small" type="success" class="tab-badge">{{ devTotal }}</el-tag>
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 内容区 -->
    <div class="content-area">
      <!-- 工具栏 -->
      <div class="toolbar">
        <!-- 左：筛选 -->
        <div class="toolbar-filters">
          <el-input
            v-model="queryParams.title"
            placeholder="搜索需求标题..."
            clearable
            class="filter-input"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="queryParams.product"
            placeholder="所属产品"
            clearable
            class="filter-select"
            @change="handleSearch"
          >
            <el-option v-for="p in productOptions" :key="p" :label="p" :value="p" />
          </el-select>
          <el-select
            v-model="queryParams.priority"
            placeholder="优先级"
            clearable
            class="filter-select filter-select--sm"
            @change="handleSearch"
          >
            <el-option label="高" value="高" />
            <el-option label="中" value="中" />
            <el-option label="低" value="低" />
          </el-select>
          <el-select
            v-model="queryParams.status"
            placeholder="状态"
            clearable
            class="filter-select filter-select--sm"
            @change="handleSearch"
          >
            <el-option label="新建" value="新建" />
            <el-option label="开发中" value="开发中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已关闭" value="已关闭" />
          </el-select>
          <el-select
            v-model="queryParams.reviewStatus"
            placeholder="审核状态"
            clearable
            class="filter-select"
            @change="handleSearch"
          >
            <el-option label="未提交" value="未提交" />
            <el-option label="待评审" value="待评审" />
            <el-option label="产品审核中" value="产品审核中" />
            <el-option label="已通过" value="已通过" />
            <el-option label="已驳回" value="已驳回" />
          </el-select>
          <el-button v-if="hasActiveFilter" link type="primary" class="reset-btn" @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>清除筛选
          </el-button>
        </div>

        <!-- 右：操作 -->
        <div class="toolbar-actions">
          <el-button plain @click="handleFeishuImport">
            <el-icon><Upload /></el-icon>飞书导入
          </el-button>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新建需求
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        :data="stories"
        style="width: 100%"
        row-key="id"
        :empty-text="' '"
        @row-click="handleRowClick"
      >
        <el-table-column type="index" width="48" align="center" class-name="index-col" />
        <el-table-column prop="title" label="需求标题" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="story-title-link" @click.stop="handleDetail(row)">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="product_name" label="所属产品" width="130" show-overflow-tooltip />
        <el-table-column prop="priority" label="优先级" width="90" align="center">
          <template #default="{ row }">
            <span class="priority-tag" :class="'priority-' + row.priority">
              {{ row.priority }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <span class="status-tag" :class="'status-' + row.status">
              {{ row.status }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="review_status" label="审核状态" width="110" align="center">
          <template #default="{ row }">
            <span class="review-tag" :class="'review-' + (row.review_status || '未提交')">
              {{ row.review_status || '未提交' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="assignee_name" label="指派给" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="assignee-cell">
              <template v-if="row.assignee_name">
                <img
                  v-if="row.assignee_avatar"
                  :src="row.assignee_avatar"
                  class="assignee-avatar assignee-avatar--img"
                  alt="avatar"
                >
                <span v-else class="assignee-avatar">{{ row.assignee_name[0] }}</span>
                <span>{{ row.assignee_name }}</span>
              </template>
              <span v-else>-</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="创建人" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="assignee-cell">
              <template v-if="row.creator_name">
                <img
                  v-if="row.creator_avatar"
                  :src="row.creator_avatar"
                  class="assignee-avatar assignee-avatar--img"
                  alt="avatar"
                >
                <span v-else class="assignee-avatar">{{ row.creator_name[0] }}</span>
                <span>{{ row.creator_name }}</span>
              </template>
              <span v-else>-</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="estimate" label="预估工时" width="90" align="center">
          <template #default="{ row }">
            <span class="estimate-text">{{ row.estimate || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="150" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template #default="{ row }">
            <div class="row-actions">
              <el-tooltip content="审核" placement="top" v-if="showReviewBtn(row)">
                <el-button size="small" circle text type="warning" @click.stop="handleReview(row)">
                  <el-icon><Stamp /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <el-button size="small" circle text @click.stop="handleEdit(row)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button size="small" circle text type="danger" @click.stop="handleDelete(row)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <!-- 空状态 -->
        <template #empty>
          <div class="empty-state">
            <el-icon class="empty-icon"><DocumentAdd /></el-icon>
            <p class="empty-title">暂无需求</p>
            <p class="empty-desc">{{ hasActiveFilter ? '没有符合筛选条件的需求，试试清除筛选' : '点击「新建需求」开始创建第一条需求' }}</p>
            <div class="empty-actions">
              <el-button v-if="hasActiveFilter" @click="handleReset">清除筛选</el-button>
              <el-button v-else type="primary" @click="handleAdd">
                <el-icon><Plus /></el-icon>新建需求
              </el-button>
            </div>
          </div>
        </template>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </div>

    <StoryDialog
      v-model:visible="dialogVisible"
      :editing-id="editingId"
      :initial-form="editingForm"
      :product-list="productList"
      :user-list="userList"
      @saved="fetchList"
    />

    <StoryDetailDialog
      v-model:visible="detailVisible"
      :row="detailRow"
      @reviewed="fetchList"
    />

    <FeishuImportDialog
      v-model:visible="feishuImportVisible"
      :product-list="productList"
      :user-list="userList"
      @imported="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search, Plus, Upload, Edit, Delete, RefreshLeft, DocumentAdd, Stamp,
} from '@element-plus/icons-vue';
import { getStoryList, deleteStory } from '@/api/story';
import { getProductList } from '@/api/product';
import { getUserList } from '@/api/user';
import StoryDialog from './components/StoryDialog.vue';
import StoryDetailDialog from './components/StoryDetailDialog.vue';
import FeishuImportDialog from './components/FeishuImportDialog.vue';

const stories = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const productOptions = ref([]);
const productList = ref([]);
const userList = ref([]);

const route = useRoute();
const router = useRouter();

const queryParams = ref({
  title: '', product: '', priority: '', status: '', reviewStatus: '',
});

const currentView = ref('all');  // all | pool | dev
const hasActiveFilter = computed(() => Object.values(queryParams.value).some((v) => v !== ''));

// 状态统计
const statusStats = computed(() => {
  const map = {
    新建: 0, 开发中: 0, 已完成: 0, 已关闭: 0,
  };
  stories.value.forEach((s) => {
    if (map[s.status] !== undefined) {
      map[s.status] += 1;
    }
  });
  return [
    {
      key: 'new', label: '新建', value: '新建', count: map['新建'],
    },
    {
      key: 'dev', label: '开发中', value: '开发中', count: map['开发中'],
    },
    {
      key: 'done', label: '已完成', value: '已完成', count: map['已完成'],
    },
    {
      key: 'closed', label: '已关闭', value: '已关闭', count: map['已关闭'],
    },
  ];
});

const filterByStatus = (val) => {
  queryParams.value.status = queryParams.value.status === val ? '' : val;
  handleSearch();
};

// 审核状态统计（基于当前列表数据）
const reviewStats = computed(() => {
  const map = { 未提交: 0, 待评审: 0, 产品审核中: 0, 已通过: 0, 已驳回: 0 };
  stories.value.forEach((s) => {
    if (map[s.review_status] !== undefined) {
      map[s.review_status] += 1;
    }
  });
  return [
    { key: 'unsubmitted', label: '未提交', value: '未提交', count: map['未提交'] },
    { key: 'pending', label: '待评审', value: '待评审', count: map['待评审'] },
    { key: 'product', label: '产品审核中', value: '产品审核中', count: map['产品审核中'] },
    { key: 'passed', label: '已通过', value: '已通过', count: map['已通过'] },
    { key: 'rejected', label: '已驳回', value: '已驳回', count: map['已驳回'] },
  ];
});

const filterByReview = (val) => {
  queryParams.value.reviewStatus = queryParams.value.reviewStatus === val ? '' : val;
  currentView.value = 'all';  // 手动筛选时切回全部视图
  handleSearch();
};

// Tab 徽标缓存：仅在「全部需求」视图时更新，避免切换视图后归零
const cachedTabStats = ref({ pool: 0, dev: 0 });

const poolTotal = computed(() => cachedTabStats.value.pool);

const devTotal = computed(() => cachedTabStats.value.dev);

const handleViewChange = (tab) => {
  // 切换视图时清除手动筛选的 reviewStatus，由 tab 参数接管
  queryParams.value.reviewStatus = '';
  currentPage.value = 1;
  fetchList();
};

const fetchOptions = async () => {
  try {
    const [prodRes, userRes] = await Promise.all([
      getProductList({ page: 1, pageSize: 999 }),
      getUserList(),
    ]);
    const prods = prodRes.data.list || [];
    productList.value = prods.map((p) => ({ id: p.id, name: p.name }));
    productOptions.value = prods.map((p) => p.name);
    userList.value = (userRes.data || []).map((u) => ({
      id: u.id,
      label: u.first_name || u.username,
      avatar: u.avatar || '',
      dept: u.dept || '',
    }));
  } catch { /* ignore */ }
};

const fetchList = async () => {
  try {
    const params = {
      ...queryParams.value,
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    // Tab 视图参数：非全部视图时传递 tab
    if (currentView.value !== 'all' && !queryParams.value.reviewStatus) {
      params.tab = currentView.value;
    }
    const res = await getStoryList(params);
    stories.value = res.data.list || [];
    total.value = res.data.total || 0;
    // 「全部需求」视图时缓存 Tab 统计数字，避免切换视图后归零
    if (currentView.value === 'all') {
      const stats = reviewStats.value;
      cachedTabStats.value.pool = (stats.find((s) => s.key === 'pending')?.count || 0)
        + (stats.find((s) => s.key === 'product')?.count || 0)
        + (stats.find((s) => s.key === 'rejected')?.count || 0);
      cachedTabStats.value.dev = (stats.find((s) => s.key === 'passed')?.count || 0);
    }
  } catch { /* ignore */ }
};

onMounted(() => {
  fetchOptions();
  fetchList().then(() => {
    // 如果 URL 带 openId 参数，自动打开对应需求的详情
    openStoryFromQuery();
  });
});

// 监听路由 query 中的 openId，从通知跳转时自动打开详情
watch(() => route.query.openId, (newId) => {
  if (newId) {
    openStoryById(Number(newId));
    // 清除 query 参数，避免刷新时重复打开
    router.replace({ query: {} });
  }
});

const openStoryFromQuery = () => {
  const id = route.query.openId;
  if (id) {
    openStoryById(Number(id));
    router.replace({ query: {} });
  }
};

const openStoryById = (id) => {
  const story = stories.value.find((s) => s.id === id);
  if (story) {
    detailRow.value = story;
    detailVisible.value = true;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchList();
};
const handleReset = () => {
  queryParams.value = {
    title: '', product: '', priority: '', status: '', reviewStatus: '',
  };
  currentView.value = 'all';
  currentPage.value = 1;
  fetchList();
};

const formatDate = (t) => {
  if (!t) return '-';
  return t.slice(0, 16).replace('T', ' ');
};

// 弹窗
const dialogVisible = ref(false);
const editingId = ref(null);
const editingForm = ref(null);

const handleAdd = () => {
  editingId.value = null;
  editingForm.value = null;
  dialogVisible.value = true;
};

const handleEdit = (row) => {
  editingId.value = row.id;
  editingForm.value = {
    title: row.title,
    product: row.product || null,
    priority: row.priority,
    status: row.status,
    assignee: row.assignee || null,
    estimate: row.estimate || '',
    description: row.description || '',
    productReviewer: row.product_reviewer || null,
    techReviewer: row.tech_reviewer || null,
  };
  dialogVisible.value = true;
};

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除需求「${row.title}」？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteStory(row.id);
      ElMessage.success('已删除');
      fetchList();
    })
    .catch(() => {});
};

const feishuImportVisible = ref(false);
const handleFeishuImport = () => { feishuImportVisible.value = true; };

const detailVisible = ref(false);
const detailRow = ref(null);

const handleDetail = (row) => {
  detailRow.value = row;
  detailVisible.value = true;
};

const handleRowClick = (row) => {
  handleDetail(row);
};

// ── 审核 ──────────────────────────────────────────────
const reviewStatusType = (s) => {
  const map = {
    待评审: 'warning',
    产品审核中: 'primary',
    技术审核中: 'primary',
    已通过: 'success',
    已驳回: 'danger',
  };
  return map[s] || 'info';
};

// 待评审/审核中/已驳回：可操作审核；未提交/已通过/已关闭：不显示
const showReviewBtn = (row) => {
  const rs = row.review_status;
  return rs && !['未提交', '已通过', '已关闭'].includes(rs);
};

const handleReview = (row) => {
  handleDetail(row);
};
</script>

<style scoped lang="scss">
.story-container {
  padding: 24px;
  background: var(--bg-page);
  min-height: 100%;
}

/* ── 页头 ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 2px;
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}

.total-badge {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border-radius: 10px;
  padding: 2px 8px;
}

/* 统计分组 */
.stats-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.stats-label {
  font-size: 12px;
  color: var(--text-regular);
  font-weight: 500;
  margin-right: 2px;
  min-width: 28px;
}

/* 状态统计条 */
.stats-row .stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  background: var(--bg-card);

  &:hover {
    border-color: currentColor;
  }
}

.stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.stat-label { color: var(--text-regular); }
.stat-count { font-weight: 600; }

.stat-new     { color: var(--el-color-primary); .stat-dot { background: var(--el-color-primary); } }
.stat-dev     { color: var(--el-color-warning); .stat-dot { background: var(--el-color-warning); } }
.stat-done    { color: var(--el-color-success); .stat-dot { background: var(--el-color-success); } }
.stat-closed  { color: var(--text-secondary); .stat-dot { background: var(--text-secondary); } }

/* 审核统计颜色 */
.stat-review-pending  { color: var(--el-color-warning); .stat-dot { background: var(--el-color-warning); } }
.stat-review-product  { color: var(--el-color-primary); .stat-dot { background: var(--el-color-primary); } }
.stat-review-passed   { color: var(--el-color-success); .stat-dot { background: var(--el-color-success); } }
.stat-review-rejected { color: var(--el-color-danger); .stat-dot { background: var(--el-color-danger); } }
.stat-review-unsubmitted { color: var(--text-secondary); .stat-dot { background: var(--text-secondary); } }

/* ── 视图 Tab ── */
.view-tabs {
  margin-bottom: 16px;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-badge {
  font-size: 11px;
  line-height: 1;
}

/* ── 内容区 ── */
.content-area {
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border-light);
  overflow: hidden;
}

/* ── 工具栏 ── */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-input {
  width: 220px;
}

.filter-select {
  width: 130px;

  &--sm {
    width: 110px;
  }
}

.reset-btn {
  font-size: 12px;
  padding: 0 4px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ── 表格 ── */
:deep(.el-table) {
  font-size: 13px;
  --el-table-border-color: transparent;
  --el-table-header-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-row-hover-bg-color: transparent;

  // 去掉所有纵向边框和表头底线
  .el-table__inner-wrapper::before {
    display: none;
  }

  td.el-table__cell,
  th.el-table__cell {
    border-right: none;
    border-bottom: 1px solid var(--border-light);
  }

  // 表头：毛玻璃 + sticky
  .el-table__header-wrapper {
    position: sticky;
    top: 0;
    z-index: 10;

    th.el-table__cell {
      background: var(--bg-elevated);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border-color);
      padding: 12px 0;
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  // 行 hover：悬浮 + 阴影
  .el-table__body-wrapper {
    .el-table__row {
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      position: relative;

      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-card);
        z-index: 5;

        td {
          background: var(--bg-card) !important;
          border-bottom-color: transparent;
        }

        td:first-child {
          box-shadow: inset 3px 0 0 var(--el-color-primary);
          border-radius: 6px 0 0 6px;
        }

        td:last-child {
          border-radius: 0 6px 6px 0;
        }
      }
    }
  }

  // 序号列
  .el-table__cell .cell {
    color: var(--text-secondary);
    font-size: 12px;
  }

  // 行内边距加大
  td.el-table__cell {
    padding: 14px 0;
  }
}

.story-title-link {
  color: var(--el-color-primary);
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: var(--el-color-primary-light-3);
    text-decoration: underline;
  }
}

/* 优先级标签 */
.priority-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  min-width: 28px;
}

.priority-高 { background: var(--el-color-danger-light-9); color: var(--el-color-danger-dark-2); border: 1px solid var(--el-color-danger-light-5); }
.priority-中 { background: var(--el-color-warning-light-9); color: var(--el-color-warning-dark-2); border: 1px solid var(--el-color-warning-light-5); }
.priority-低 { background: var(--el-color-primary-light-9); color: var(--el-color-primary-dark-2); border: 1px solid var(--el-color-primary-light-5); }

/* 状态标签 */
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  min-width: 48px;
}

.status-新建   { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
.status-开发中 { background: var(--el-color-warning-light-9); color: var(--el-color-warning-dark-2); }
.status-已完成 { background: var(--el-color-success-light-9); color: var(--el-color-success-dark-2); }
.status-已关闭 { background: var(--bg-elevated); color: var(--text-secondary); }

/* 审核状态标签（与优先级/状态统一风格） */
.review-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  min-width: 48px;
}

.review-待评审     { background: var(--el-color-warning-light-9); color: var(--el-color-warning-dark-2); border: 1px solid var(--el-color-warning-light-5); }
.review-未提交     { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-color); }
.review-产品审核中 { background: var(--el-color-primary-light-9); color: var(--el-color-primary-dark-2); border: 1px solid var(--el-color-primary-light-5); }
.review-技术审核中 { background: var(--el-color-primary-light-9); color: var(--el-color-primary-dark-2); border: 1px solid var(--el-color-primary-light-5); }
.review-已通过     { background: var(--el-color-success-light-9); color: var(--el-color-success-dark-2); border: 1px solid var(--el-color-success-light-5); }
.review-已驳回     { background: var(--el-color-danger-light-9); color: var(--el-color-danger-dark-2); border: 1px solid var(--el-color-danger-light-5); }

/* 指派人 */
.assignee-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-regular);
}

.assignee-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--img {
    background: none;
    object-fit: cover;
  }
}

.estimate-text {
  color: var(--text-regular);
  font-size: 12px;
}

.time-text {
  color: var(--text-secondary);
  font-size: 12px;
}

/* 行操作 */
.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;

  :deep(.el-table__row):hover & {
    opacity: 1;
  }
}

:deep(.el-table__row:hover) .row-actions {
  opacity: 1;
}

/* 空状态 */
.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.empty-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-regular);
  margin: 0 0 6px;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 20px;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

/* 分页 */
.pagination-wrapper {
  padding: 14px 24px;
  display: flex;
  justify-content: flex-end;
}
</style>
