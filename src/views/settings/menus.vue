<template>
  <div class="menus-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>菜单管理</span>
          <el-button type="primary" size="small" :icon="Plus" @click="openDialog(null)">新增菜单</el-button>
        </div>
      </template>

      <el-table
        :data="treeData"
        row-key="id"
        :tree-props="{ children: 'children' }"
        default-expand-all
        style="width: 100%"
      >
        <el-table-column prop="title" label="菜单名称" min-width="180">
          <template #default="{ row }">
            <el-icon v-if="row.icon" style="margin-right: 6px; vertical-align: middle">
              <component :is="row.icon" />
            </el-icon>
            {{ row.title }}
          </template>
        </el-table-column>
        <el-table-column prop="perm_id" label="权限标识" min-width="160" />
        <el-table-column prop="path" label="路由路径" min-width="180" />
        <el-table-column prop="sort_order" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" link type="primary" @click="openDialog(null, row.id)">添加子项</el-button>
            <el-button size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑菜单' : '新增菜单'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="菜单名称" prop="title">
          <el-input v-model="form.title" placeholder="如：接口管理" />
        </el-form-item>
        <el-form-item label="权限标识" prop="perm_id">
          <el-input v-model="form.perm_id" placeholder="如：dev-api-manage" />
        </el-form-item>
        <el-form-item label="路由路径" prop="path">
          <el-input v-model="form.path" placeholder="如：/dev/api-manage" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="Element Plus 图标名，如 Link" />
        </el-form-item>
        <el-form-item label="父菜单">
          <el-select v-model="form.parent" placeholder="无（顶级菜单）" clearable style="width: 100%">
            <el-option
              v-for="item in flatList"
              :key="item.id"
              :label="item.title"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.is_active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getMenuTree, createMenu, updateMenu, deleteMenu,
} from '@/api/role';

const treeData = ref([]);
const flatList = ref([]);

function flatten(items, result = []) {
  items.forEach((item) => {
    result.push({ id: item.id, title: item.title });
    if (item.children) flatten(item.children, result);
  });
  return result;
}

async function loadMenus() {
  const res = await getMenuTree();
  treeData.value = res.data || [];
  flatList.value = flatten(treeData.value);
}

onMounted(loadMenus);

const dialogVisible = ref(false);
const editingId = ref(null);
const saving = ref(false);
const formRef = ref(null);
const form = ref({
  title: '', perm_id: '', path: '', icon: '', parent: null, sort_order: 0, is_active: true,
});
const rules = {
  title: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  perm_id: [{ required: true, message: '请输入权限标识', trigger: 'blur' }],
  path: [{ required: true, message: '请输入路由路径', trigger: 'blur' }],
};

function openDialog(row, defaultParent = null) {
  editingId.value = row?.id ?? null;
  form.value = {
    title: row?.title ?? '',
    perm_id: row?.perm_id ?? '',
    path: row?.path ?? '',
    icon: row?.icon ?? '',
    parent: row?.parent ?? defaultParent,
    sort_order: row?.sort_order ?? 0,
    is_active: row?.is_active ?? true,
  };
  dialogVisible.value = true;
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (editingId.value) {
      await updateMenu(editingId.value, form.value);
      ElMessage.success('已更新');
    } else {
      await createMenu(form.value);
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    await loadMenus();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  const countSubItems = (children) => {
    let count = children.length;
    children.forEach((c) => { if (c.children) count += c.children.length; });
    return count;
  };
  const hasChildren = row.children && row.children.length > 0;
  const msg = hasChildren
    ? `确定删除菜单「${row.title}」？该菜单下有 ${countSubItems(row.children)} 个子菜单，都将一并删除且不可恢复。`
    : `确定删除菜单「${row.title}」？删除后不可恢复。`;
  await ElMessageBox.confirm(msg, '删除确认', {
    confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning',
  });
  await deleteMenu(row.id);
  ElMessage.success('已删除');
  await loadMenus();
}
</script>

<style scoped lang="scss">
.menus-container {
  padding: 4px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
