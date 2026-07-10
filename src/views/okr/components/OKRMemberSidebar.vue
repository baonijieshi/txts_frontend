<template>
  <div class="member-sidebar">
    <!-- ── 搜索框 ── -->
    <div class="search-wrap">
      <el-input
        v-model="searchQuery"
        placeholder="搜索成员..."
        size="small"
        clearable
        @focus="searchFocused = true"
        @blur="handleSearchBlur"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <div v-if="searchFocused && searchResults.length" class="search-dropdown">
        <div
          v-for="u in searchResults"
          :key="u.id"
          class="sidebar-item"
          @mousedown.prevent="handleSearchSelect(u)"
        >
          <div class="sidebar-item__avatar">
            <img v-if="u.avatar" :src="u.avatar" alt="" />
            <span v-else class="sidebar-item__avatar-fallback">{{ u.label[0] }}</span>
          </div>
          <div class="sidebar-item__meta">
            <span class="sidebar-item__name">{{ u.label }}</span>
            <span class="sidebar-item__dept">{{ u.dept || '未分配部门' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 管理员 ── -->
    <template v-if="memberTree.is_admin">
      <div v-if="memberTree.direct_superior" class="sidebar-group">
        <div class="sidebar-group__label">直属上级</div>
        <div
          class="sidebar-item"
          :class="{ 'is-selected': selectedMemberId === memberTree.direct_superior.id }"
          @click="selectMember(memberTree.direct_superior)"
        >
          <div class="sidebar-item__avatar">
            <img v-if="memberTree.direct_superior.avatar" :src="memberTree.direct_superior.avatar" alt="" />
            <span v-else class="sidebar-item__avatar-fallback">{{ memberTree.direct_superior.name[0] }}</span>
          </div>
          <span class="sidebar-item__name">{{ memberTree.direct_superior.name }}</span>
        </div>
      </div>

      <div class="sidebar-group">
        <div class="sidebar-group__label">我的 OKR</div>
        <div
          class="sidebar-item"
          :class="{ 'is-selected': selectedMemberId === memberTree.my?.id }"
          @click="selectMember(memberTree.my)"
        >
          <div class="sidebar-item__avatar">
            <img v-if="memberTree.my?.avatar" :src="memberTree.my.avatar" alt="" />
            <span v-else class="sidebar-item__avatar-fallback">{{ (memberTree.my?.name || '我')[0] }}</span>
          </div>
          <span class="sidebar-item__name">{{ memberTree.my?.name || '我' }}</span>
        </div>
      </div>

      <!-- ── 管理员：全部成员按部门 ── -->
      <div v-for="group in memberTree.all_members" :key="group.dept" class="sidebar-group">
        <div class="sidebar-group__label">{{ group.dept }}</div>
        <div
          v-for="m in group.members" :key="m.id"
          class="sidebar-item"
          :class="{ 'is-selected': selectedMemberId === m.id }"
          @click="selectMember(m)"
        >
          <div class="sidebar-item__avatar">
            <img v-if="m.avatar" :src="m.avatar" alt="" />
            <span v-else class="sidebar-item__avatar-fallback">{{ m.name[0] }}</span>
          </div>
          <span class="sidebar-item__name">{{ m.name }}</span>
        </div>
      </div>
    </template>

    <!-- ── 普通用户 ── -->
    <template v-else>
      <div class="sidebar-group">
        <div class="sidebar-group__label">我的 OKR</div>
        <div
          class="sidebar-item"
          :class="{ 'is-selected': selectedMemberId === memberTree.my?.id }"
          @click="selectMember(memberTree.my)"
        >
          <div class="sidebar-item__avatar">
            <img v-if="memberTree.my?.avatar" :src="memberTree.my.avatar" alt="" />
            <span v-else class="sidebar-item__avatar-fallback">{{ (memberTree.my?.name || '我')[0] }}</span>
          </div>
          <span class="sidebar-item__name">{{ memberTree.my?.name || '我' }}</span>
        </div>
      </div>

      <div v-if="memberTree.direct_superior" class="sidebar-group">
        <div class="sidebar-group__label">直属上级</div>
        <div
          class="sidebar-item"
          :class="{ 'is-selected': selectedMemberId === memberTree.direct_superior.id }"
          @click="selectMember(memberTree.direct_superior)"
        >
          <div class="sidebar-item__avatar">
            <img v-if="memberTree.direct_superior.avatar" :src="memberTree.direct_superior.avatar" alt="" />
            <span v-else class="sidebar-item__avatar-fallback">{{ memberTree.direct_superior.name[0] }}</span>
          </div>
          <span class="sidebar-item__name">{{ memberTree.direct_superior.name }}</span>
        </div>
      </div>

      <div v-if="memberTree.same_superior_colleagues?.length" class="sidebar-group">
        <div class="sidebar-group__label">相同上级同事</div>
        <div
          v-for="c in memberTree.same_superior_colleagues" :key="c.id"
          class="sidebar-item"
          :class="{ 'is-selected': selectedMemberId === c.id }"
          @click="selectMember(c)"
        >
          <div class="sidebar-item__avatar">
            <img v-if="c.avatar" :src="c.avatar" alt="" />
            <span v-else class="sidebar-item__avatar-fallback">{{ c.name[0] }}</span>
          </div>
          <span class="sidebar-item__name">{{ c.name }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { getMemberTree } from '@/api/okr';

const props = defineProps({
  userList: { type: Array, default: () => [] },
});
const emit = defineEmits(['select']);
const memberTree = ref({ is_admin: false, my: null, direct_superior: null, same_superior_colleagues: [], all_members: [] });
const selectedMemberId = ref(null);

// ── 搜索 ──
const searchQuery = ref('');
const searchFocused = ref(false);
const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return (props.userList || []).slice(0, 8);
  return (props.userList || []).filter(u => {
    const name = (u.label || '').toLowerCase();
    const dept = (u.dept || '').toLowerCase();
    return name.includes(q) || dept.includes(q);
  }).slice(0, 8);
});
const handleSearchBlur = () => { setTimeout(() => { searchFocused.value = false; }, 150); };
const handleSearchSelect = (u) => {
  searchQuery.value = '';
  searchFocused.value = false;
  selectMember({ id: u.id, name: u.label, leader_id: null });
};

const fetchMemberTree = async () => {
  try {
    const d = (await getMemberTree()).data;
    memberTree.value = d;
    selectedMemberId.value = d.is_admin ? null : d.my?.id || null;
    // 普通用户默认选中自己，emit 通知父组件
    if (!d.is_admin && d.my) {
      emit('select', d.my);
    }
  } catch {}
};

const selectMember = (m) => { if (!m) return; selectedMemberId.value = m.id; emit('select', { id: m.id, name: m.name, leader_id: m.leader_id }); };
defineExpose({ fetchMemberTree });
onMounted(() => fetchMemberTree());
</script>

<style scoped lang="scss">
.member-sidebar {
  width: 220px;
  background: var(--bg-card);
  border-radius: 14px;
  box-shadow: var(--shadow-dropdown);
  padding: 14px 10px;
  flex-shrink: 0;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
}
.sidebar-group {
  margin-bottom: 2px;
}
.sidebar-group__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: .4px;
  padding: 8px 10px 4px;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s;

  &:hover { background: var(--bg-hover); }
  &.is-selected {
    background: var(--el-color-primary-light-9);
    .sidebar-item__name { color: var(--el-color-primary); font-weight: 600; }
  }
}
.sidebar-item__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  img { width: 100%; height: 100%; object-fit: cover; }
}
.sidebar-item__avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.sidebar-item__name {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 搜索 ── */
.search-wrap {
  position: relative;
  margin-bottom: 10px;
}
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--bg-card);
  border-radius: 10px;
  box-shadow: var(--shadow-dropdown);
  margin-top: 4px;
  padding: 4px;
  max-height: 260px;
  overflow-y: auto;
}
.sidebar-item__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.sidebar-item__dept {
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
