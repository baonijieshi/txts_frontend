<template>
  <div class="product-container">
    <!-- 顶部操作栏 -->
    <div class="product-header">
      <div class="header-left">
        <h2 class="page-title">产品管理</h2>
        <span class="product-count">共 {{ filteredList.length }} 个产品</span>
      </div>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>新建产品
      </el-button>
    </div>

    <!-- 产品卡片列表 -->
    <div class="product-grid">
      <div
        v-for="item in filteredList"
        :key="item.id"
        class="product-card"
      >
        <!-- 封面图区域 -->
        <div class="card-cover" :style="getCoverStyle(item)" @click="handleEdit(item)">
          <img v-if="item.cover" :src="item.cover" alt="" class="cover-img" />
          <div class="cover-overlay">
            <div class="cover-content">
              <h3 class="cover-title">{{ item.name }}</h3>
              <el-tag
                :type="item.status === '活跃' ? 'success' : 'info'"
                size="small"
                effect="dark"
              >{{ item.status }}</el-tag>
            </div>
          </div>
        </div>

        <div class="card-body">
          <p v-if="item.code" class="card-code">{{ item.code }}</p>
          <p class="card-desc">{{ item.description || '暂无描述' }}</p>

          <div class="card-stats">
            <div class="stat-item">
              <el-icon class="stat-icon" style="color: var(--el-color-primary)"><Document /></el-icon>
              <span class="stat-value">{{ item.story_count || 0 }}</span>
              <span class="stat-label">需求</span>
            </div>
            <div class="stat-item">
              <el-icon class="stat-icon" style="color: var(--el-color-success)"><User /></el-icon>
              <span class="stat-value">{{ item.owner_name || '未指派' }}</span>
            </div>
            <div v-if="item.line" class="stat-item">
              <el-icon class="stat-icon" style="color: var(--el-color-warning)"><Collection /></el-icon>
              <span class="stat-value">{{ item.line }}</span>
            </div>
          </div>

          <div class="card-footer">
            <span class="card-time">{{ item.created_at }}</span>
            <div class="card-actions">
              <el-button size="small" link type="primary" @click="handleEdit(item)">
                <el-icon><Edit /></el-icon>编辑
              </el-button>
              <el-button size="small" link type="danger" @click="handleDelete(item)">
                <el-icon><Delete /></el-icon>删除
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!filteredList.length" class="empty-state">
        <el-empty description="暂无产品，点击上方按钮创建" />
      </div>
    </div>

    <ProductDialog
      v-model:visible="dialogVisible"
      :editing-id="editingId"
      :initial-form="editingForm"
      :user-options="userOptions"
      @saved="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getProductList, deleteProduct,
} from '@/api/product';
import { getUserList } from '@/api/user';
import ProductDialog from './components/ProductDialog.vue';

const products = ref([]);
const userOptions = ref([]);

const filteredList = computed(() => products.value);

const accentColors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#b37feb'];
const getAccentColor = (item) => {
  const idx = (item.id || 0) % accentColors.length;
  return accentColors[idx];
};

const getCoverStyle = (item) => {
  if (item.cover) return {};
  const color = getAccentColor(item);
  return { background: `linear-gradient(135deg, ${color}, ${color}dd)` };
};

const fetchList = async () => {
  try {
    const res = await getProductList();
    products.value = res.data.list || [];
  } catch {
    // 获取产品列表失败
  }
};

const fetchUsers = async () => {
  try {
    const res = await getUserList();
    userOptions.value = (res.data || []).map((u) => ({
      id: u.id,
      label: u.first_name || u.username,
      avatar: u.avatar || '',
      dept: u.dept || '',
    }));
  } catch {
    // 获取用户列表失败
  }
};

onMounted(() => {
  fetchList();
  fetchUsers();
});

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
    name: row.name,
    code: row.code || '',
    line: row.line || '',
    owner: row.owner || null,
    status: row.status,
    description: row.description || '',
    cover: row.cover || '',
  };
  dialogVisible.value = true;
};

const handleDelete = (row) => {
  ElMessageBox.confirm('确定删除产品「'.concat(row.name, '」？'), '提示', { type: 'warning' })
    .then(async () => {
      await deleteProduct(row.id);
      ElMessage.success('已删除');
      fetchList();
    })
    .catch(() => {});
};
</script>

<style scoped lang="scss">
.product-container {
  padding: 20px;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .page-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .product-count {
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.product-card {
  background: var(--bg-card);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-dropdown);
  transition: transform 0.35s cubic-bezier(0.33, 1, 0.68, 1),
              box-shadow 0.35s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-hover);
  }
}

@keyframes cardFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

/* 封面区域 */
.card-cover {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-elevated);
  flex-shrink: 0;

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  &:hover .cover-img {
    transform: scale(1.05);
  }

  .cover-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.55) 0%,
      rgba(0, 0, 0, 0.1) 50%,
      rgba(0, 0, 0, 0.05) 100%
    );
    display: flex;
    align-items: flex-end;
    padding: 16px;
  }

  .cover-content {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .cover-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.5px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
}

.card-body {
  padding: 16px 20px 14px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-code {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
}

.card-desc {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.5;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid var(--border-color);
  margin-bottom: 10px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;

  .stat-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .stat-value {
    color: var(--text-primary);
    font-weight: 500;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stat-label {
    color: var(--text-secondary);
    margin-left: 2px;
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.card-actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 60px 0;
}
</style>
