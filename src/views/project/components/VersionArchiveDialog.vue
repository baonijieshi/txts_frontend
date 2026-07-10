<template>
  <el-dialog
    :model-value="visible"
    width="800px"
    destroy-on-close
    class="archive-dialog"
    @update:model-value="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="archive-dialog__header">
        <div class="archive-dialog__header-left">
          <span class="archive-dialog__title">归档仓库</span>
          <span class="archive-dialog__count">{{ displayCount }} 个历史归档版本</span>
        </div>
        <el-input
          v-model="searchQuery"
          placeholder="搜索归档版本..."
          clearable
          :prefix-icon="Search"
          class="archive-dialog__search"
        />
      </div>
    </template>

    <div class="archive-dialog__body">
      <div v-if="loading" v-loading="loading" class="archive-dialog__loading" />

      <div v-else-if="displayCount === 0" class="archive-dialog__empty">
        <div class="empty-icon">
          <el-icon :size="48"><FolderOpened /></el-icon>
        </div>
        <p class="empty-title">{{ searchQuery ? '没有匹配的归档版本' : '暂无历史归档版本' }}</p>
        <p class="empty-desc">{{ searchQuery ? '试试调整搜索关键词' : '当年的归档版本仍保留在看板「已归档」列中，跨年的历史版本会集中在此处' }}</p>
      </div>

      <div v-else class="archive-dialog__grouped">
        <div v-for="group in groupedArchives" :key="group.year" class="archive-group">
          <div
            class="archive-group__header"
            role="button"
            tabindex="0"
            :aria-expanded="expandedYears.has(group.year)"
            @click="toggleYear(group.year)"
            @keydown.enter="toggleYear(group.year)"
          >
            <el-icon class="archive-group__arrow" :class="{ 'is-open': expandedYears.has(group.year) }">
              <ArrowRight />
            </el-icon>
            <span class="archive-group__label">{{ group.year }} 年</span>
            <span class="archive-group__badge">{{ group.versions.length }} 个</span>
          </div>

          <el-collapse-transition>
            <div v-show="expandedYears.has(group.year)" class="archive-group__list">
              <div v-for="ver in group.versions" :key="ver.id" class="archive-card">
                <div class="archive-card__dot" />
                <div class="archive-card__body">
                  <div class="archive-card__top">
                    <span class="archive-card__name">{{ ver.name }}</span>
                    <el-tag type="info" size="small" effect="plain" round>{{ ver.status }}</el-tag>
                  </div>
                  <div class="archive-card__meta">
                    <el-icon><Calendar /></el-icon>
                    <span>{{ ver.startDate || '?' }} ~ {{ ver.endDate || '?' }}</span>
                  </div>
                </div>
                <div class="archive-card__actions">
                  <el-button size="small" link type="primary" @click="handleUnarchive(ver)">取消归档</el-button>
                  <el-button size="small" link type="danger" @click="handleDelete(ver)">删除</el-button>
                </div>
              </div>
            </div>
          </el-collapse-transition>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox, ElCollapseTransition } from 'element-plus';
import { Search, Calendar, ArrowRight, FolderOpened } from '@element-plus/icons-vue';
import { getVersionList, deleteVersion, archiveVersion } from '@/api/version';

const props = defineProps({
  visible: Boolean,
});

const emit = defineEmits(['update:visible', 'refresh']);

const loading = ref(false);
const archives = ref([]);
const searchQuery = ref('');
const expandedYears = ref(new Set());

const currentYear = new Date().getFullYear();

const getYear = (dateStr) => {
  if (!dateStr) return '未知';
  return String(new Date(dateStr).getFullYear());
};

const filteredArchives = computed(() => {
  if (!searchQuery.value) return archives.value;
  const q = searchQuery.value.toLowerCase();
  return archives.value.filter((v) => v.name.toLowerCase().includes(q));
});

const groupedArchives = computed(() => {
  const map = {};
  filteredArchives.value.forEach((ver) => {
    const year = getYear(ver.startDate || ver.endDate || '');
    const yearNum = parseInt(year, 10);
    // 只展示今年以前的归档版本
    if (isNaN(yearNum) || yearNum >= currentYear) return;
    if (!map[year]) map[year] = [];
    map[year].push(ver);
  });
  return Object.keys(map)
    .sort((a, b) => {
      if (a === '未知') return 1;
      if (b === '未知') return -1;
      return b.localeCompare(a);
    })
    .map((year) => ({
      year,
      versions: map[year],
    }));
});

const displayCount = computed(() => {
  return groupedArchives.value.reduce((sum, g) => sum + g.versions.length, 0);
});

const toggleYear = (year) => {
  const s = new Set(expandedYears.value);
  if (s.has(year)) {
    s.delete(year);
  } else {
    s.add(year);
  }
  expandedYears.value = s;
};

const mapVersion = (v) => ({
  id: v.id,
  name: v.name || '',
  status: v.status || '',
  startDate: v.start_date || '',
  endDate: v.end_date || '',
});

const fetchArchives = async () => {
  loading.value = true;
  try {
    const res = await getVersionList({ page: 1, pageSize: 999, status: '已归档' });
    archives.value = (res.data.list || []).map(mapVersion);
    const years = new Set();
    archives.value.forEach((v) => {
      const y = getYear(v.startDate || v.endDate || '');
      if (y !== '未知') years.add(y);
    });
    expandedYears.value = years;
  } catch {
    archives.value = [];
  } finally {
    loading.value = false;
  }
};

const handleUnarchive = async (ver) => {
  try {
    await archiveVersion(ver.id);
    ElMessage.success('已取消归档');
    fetchArchives();
    emit('refresh');
  } catch {
    // error handled globally
  }
};

const handleDelete = async (ver) => {
  try {
    await ElMessageBox.confirm(
      `确定删除归档版本「${ver.name}」？删除后不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
    await deleteVersion(ver.id);
    ElMessage.success('已删除');
    fetchArchives();
    emit('refresh');
  } catch {
    // cancelled or error
  }
};

watch(() => props.visible, (val) => {
  if (val) {
    searchQuery.value = '';
    fetchArchives();
  }
});
</script>

<style scoped lang="scss">
.archive-dialog {
  :deep(.el-dialog) {
    border-radius: 20px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    padding: 0;
    margin-right: 0;
    border-bottom: 1px solid var(--border-light);
    background: var(--bg-card);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
  }

  :deep(.el-dialog__body) {
    padding: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 28px;
  }

  &__header-left {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-shrink: 0;
  }

  &__title {
    font-size: 19px;
    font-weight: 650;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }

  &__count {
    font-size: 13px;
    color: var(--text-secondary);
  }

  &__search {
    width: 220px;

    :deep(.el-input__wrapper) {
      border-radius: 10px;
      border: 1px solid var(--border-light);
      box-shadow: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:hover { border-color: var(--border-color); }
      &.is-focus {
        border-color: var(--el-color-primary);
        box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
      }
    }
  }

  &__body {
    padding: 16px 28px 24px;
    min-height: 200px;
    max-height: 560px;
    overflow-y: auto;
  }

  &__loading {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 0 40px;
    text-align: center;

    .empty-icon {
      margin-bottom: 16px;
      .el-icon { color: var(--text-placeholder); }
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
      margin: 0;
      max-width: 360px;
      line-height: 1.6;
    }
  }

  &__grouped {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
}

.archive-group {
  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    cursor: pointer;
    user-select: none;
    border-radius: 10px;
    transition: background 0.15s;
    &:hover { background: var(--bg-hover); }
  }

  &__arrow {
    font-size: 13px;
    color: var(--text-secondary);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    &.is-open { transform: rotate(90deg); }
  }

  &__label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
  }

  &__badge {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-placeholder);
    background: var(--bg-hover);
    padding: 1px 8px;
    border-radius: 10px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 0 6px 24px;
  }
}

.archive-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bg-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 6px;
    background: var(--text-placeholder);
    box-shadow: 0 0 0 2px var(--bg-hover);
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);
    .el-icon { font-size: 12px; }
  }

  &__actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.2s;
    padding-top: 2px;
  }

  &:hover &__actions { opacity: 1; }
}
</style>
