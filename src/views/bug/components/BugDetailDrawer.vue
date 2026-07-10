<template>
  <div>
    <el-drawer
      :model-value="visible"
      title="Bug 详情"
      size="700px"
      destroy-on-close
      @update:model-value="$emit('update:visible', $event)"
    >
      <div v-if="bug" class="drawer-body">

        <!-- 标题行 -->
        <div class="bug-header">
          <span :class="['sev-bar', `sev-${bug.severity}`]" />
          <span class="bug-title">{{ bug.title }}</span>
          <span :class="['status-pill', `status-${bug.status}`]">{{ bug.status }}</span>
        </div>

        <!-- 基本信息 -->
        <div class="section">
          <div class="section-title">基本信息</div>
          <div class="desc-list">
            <div class="desc-row">
              <span class="desc-label">Bug 类型</span>
              <span class="desc-value">{{ bug.bug_type || '-' }}</span>
              <span class="desc-label">所属模块</span>
              <span class="desc-value">{{ bug.module || '-' }}</span>
            </div>
            <div class="desc-row">
              <span class="desc-label">严重程度</span>
              <span class="desc-value">
                <span :class="['sev-tag', `sev-tag-${bug.severity}`]">{{ bug.severity }}</span>
              </span>
              <span class="desc-label">优先级</span>
              <span class="desc-value">
                <span :class="['pri-tag', `pri-${bug.priority?.toLowerCase()}`]">{{ bug.priority }}</span>
              </span>
            </div>
            <div class="desc-row">
              <span class="desc-label">指派给</span>
              <span class="desc-value">
                <span v-if="bug.assignee_name" class="user-cell">
                  <el-avatar :size="18" :src="bug.assignee_avatar || ''" :style="bug.assignee_avatar ? {} : avatarGradientStyle(bug.assignee_name)">
                    <span>{{ String(bug.assignee_name).charAt(0) }}</span>
                  </el-avatar>
                  {{ bug.assignee_name }}
                </span>
                <span v-else>-</span>
              </span>
              <span class="desc-label">创建人</span>
              <span class="desc-value">
                <span v-if="bug.reporter_name" class="user-cell">
                  <el-avatar :size="18" :src="bug.reporter_avatar || ''" :style="bug.reporter_avatar ? {} : avatarGradientStyle(bug.reporter_name)">
                    <span>{{ String(bug.reporter_name).charAt(0) }}</span>
                  </el-avatar>
                  {{ bug.reporter_name }}
                </span>
                <span v-else>-</span>
              </span>
            </div>
            <div class="desc-row">
              <span class="desc-label">所属项目</span>
              <span class="desc-value">{{ bug.project_name || '-' }}</span>
              <span class="desc-label">关联版本</span>
              <span class="desc-value">
                <span v-if="bug.version_name" class="ver-tag">{{ bug.version_name }}</span>
                <span v-else>-</span>
              </span>
            </div>
            <div class="desc-row">
              <span class="desc-label">创建时间</span>
              <span class="desc-value">{{ bug.created_at || '-' }}</span>
              <span class="desc-label">状态切换</span>
              <span class="desc-value">
                <el-dropdown trigger="click" @command="(val) => $emit('statusChange', bug, val)">
                  <span :class="['status-pill', `status-${bug.status}`]" style="cursor: pointer">
                    {{ bug.status }}
                    <el-icon style="margin-left: 2px; font-size: 10px"><ArrowDown /></el-icon>
                  </span>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="s in statusOptions"
                        :key="s"
                        :command="s"
                        :disabled="s === bug.status"
                      >
                        <span :class="['status-pill', `status-${s}`]">{{ s }}</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </span>
            </div>
            <div v-if="bug.remark" class="desc-row">
              <span class="desc-label">备注</span>
              <span class="desc-value desc-value--span">{{ bug.remark }}</span>
            </div>
          </div>
        </div>

        <!-- 解决信息（有解决人时显示） -->
        <div v-if="bug.resolver_name" class="section">
          <div class="section-title">解决信息</div>
          <div class="desc-list">
            <div class="desc-row">
              <span class="desc-label">解决人</span>
              <span class="desc-value">
                <span class="user-cell">
                  <el-avatar :size="18" :src="bug.resolver_avatar || ''" :style="bug.resolver_avatar ? {} : avatarGradientStyle(bug.resolver_name)">
                    <span>{{ String(bug.resolver_name).charAt(0) }}</span>
                  </el-avatar>
                  {{ bug.resolver_name }}
                </span>
              </span>
              <span class="desc-label">解决时间</span>
              <span class="desc-value">{{ bug.resolved_at || '-' }}</span>
            </div>
            <div v-if="bug.resolution" class="desc-row">
              <span class="desc-label">解决类型</span>
              <span class="desc-value">{{ bug.resolution }}</span>
              <span class="desc-label">产生原因</span>
              <span class="desc-value">{{ bug.cause || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 重现步骤 -->
        <div class="section">
          <div class="section-title">重现步骤</div>
          <div
            v-if="bug.steps_to_reproduce"
            ref="stepsRef"
            class="steps-content"
            v-html="bug.steps_to_reproduce"
          />
          <div v-else class="steps-empty">暂无重现步骤</div>
        </div>

      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="$emit('update:visible', false)">关闭</el-button>
          <div v-if="bug" class="footer-actions">
            <el-button type="primary" plain @click="$emit('edit', bug)">编辑</el-button>
            <el-button
              v-if="!['已解决', '已关闭'].includes(bug.status)"
              type="success"
              @click="$emit('resolve', bug)"
            >解决</el-button>
            <el-button
              v-else
              type="warning"
              @click="$emit('activate', bug)"
            >激活</el-button>
            <el-button type="danger" plain @click="$emit('delete', bug)">删除</el-button>
          </div>
        </div>
      </template>
    </el-drawer>

    <el-image-viewer
      v-if="previewVisible && previewList.length"
      :url-list="previewList"
      :initial-index="previewIndex"
      @close="previewVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, watch, nextTick } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';

const statusOptions = ['待处理', '处理中', '已解决', '已关闭', '已拒绝'];

const props = defineProps({
  visible: Boolean,
  bug: { type: Object, default: null },
});

defineEmits(['update:visible', 'edit', 'resolve', 'activate', 'statusChange', 'delete']);

const avatarGradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
];
function avatarGradientStyle(name) {
  if (!name) return { background: avatarGradients[0], color: '#fff' };
  return { background: avatarGradients[name.charCodeAt(0) % avatarGradients.length], color: '#fff' };
}

const stepsRef = ref(null);
const previewVisible = ref(false);
const previewList = ref([]);
const previewIndex = ref(0);

watch(() => props.bug, async () => {
  await nextTick();
  if (!stepsRef.value) return;
  const imgs = stepsRef.value.querySelectorAll('img');
  const urls = Array.from(imgs).map((img) => img.src);
  imgs.forEach((img, i) => {
    img.style.cursor = 'zoom-in';
    img.onclick = () => {
      previewList.value = urls;
      previewIndex.value = i;
      previewVisible.value = true;
    };
  });
});
</script>

<style scoped lang="scss">
.drawer-body {
  padding: 4px 0 24px;
  overflow-y: auto;
}

/* 标题行 */
.bug-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
}

.sev-bar {
  display: inline-block;
  width: 4px;
  min-height: 20px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-top: 3px;

  &.sev-致命 { background: var(--el-color-danger); }
  &.sev-严重 { background: var(--el-color-warning); }
  &.sev-一般 { background: var(--el-color-primary); }
  &.sev-轻微 { background: var(--el-color-success); }
  &.sev-建议 { background: var(--text-secondary); }
}

.bug-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-all;
}

.status-pill {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;

  &.status-待处理 { background: var(--bg-elevated); color: var(--text-secondary); }
  &.status-处理中 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.status-已解决 { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.status-已关闭 { background: var(--bg-elevated); color: var(--text-regular); }
  &.status-已拒绝 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.status-激活   { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
}

/* 分区 */
.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

/* 描述列表 */
.desc-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.desc-row {
  display: grid;
  grid-template-columns: 80px 1fr 80px 1fr;
  align-items: center;
  min-height: 36px;
  border-bottom: 1px solid var(--border-color);

  &:last-child { border-bottom: none; }
}

.desc-label {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 8px 12px 8px 0;
  white-space: nowrap;
}

.desc-value {
  font-size: 13px;
  color: var(--text-primary);
  padding: 8px 16px 8px 0;

  &--span {
    grid-column: 2 / -1;
  }
}

/* 严重程度 tag */
.sev-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;

  &.sev-tag-致命 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.sev-tag-严重 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.sev-tag-一般 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.sev-tag-轻微 { background: var(--el-color-success-light-9); color: var(--el-color-success); }
  &.sev-tag-建议 { background: var(--bg-elevated); color: var(--text-secondary); }
}

/* 优先级 tag */
.pri-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;

  &.pri-p0 { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
  &.pri-p1 { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
  &.pri-p2 { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  &.pri-p3 { background: var(--bg-elevated); color: var(--text-secondary); }
}

/* 版本 tag */
.ver-tag {
  display: inline-block;
  padding: 1px 8px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 3px;
  font-size: 12px;
}

/* 用户行 */
.user-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-primary);
}

/* 重现步骤 */
.steps-content {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-primary);
  background: var(--bg-elevated);
  border-radius: 6px;
  padding: 12px 16px;

  :deep(img) {
    max-width: 100%;
    border-radius: 4px;
    cursor: zoom-in;
    &:hover { opacity: 0.85; }
  }
  :deep(p) { margin: 4px 0; }
  :deep(pre) {
    background: var(--bg-card);
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }
  :deep(code) {
    background: var(--bg-card);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: monospace;
  }
}

.steps-empty {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 12px 0;
}

/* footer */
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.footer-actions {
  display: flex;
  gap: 8px;
}
</style>
