<template>
  <div class="report-detail">
    <!-- 概览 -->
    <el-descriptions :column="4" border size="small" style="margin-bottom:16px">
      <el-descriptions-item label="场景">{{ report.scene_name }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="statusTagType(report.status)" size="small">{{ report.status }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="通过率">
        <span :style="{ color: report.pass_rate === 100 ? 'var(--el-color-success)' : 'var(--el-color-danger)', fontWeight: 600 }">
          {{ report.pass_rate }}%
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="总耗时">{{ report.duration_ms }} ms</el-descriptions-item>
      <el-descriptions-item label="步骤">{{ report.passed_steps }}/{{ report.total_steps }} 通过</el-descriptions-item>
      <el-descriptions-item label="环境">{{ report.env_name || '-' }}</el-descriptions-item>
      <el-descriptions-item label="执行人">{{ report.executor_name || '-' }}</el-descriptions-item>
      <el-descriptions-item label="执行时间">{{ report.created_at }}</el-descriptions-item>
    </el-descriptions>

    <!-- 步骤结果 -->
    <el-collapse accordion>
      <el-collapse-item
        v-for="step in report.step_results"
        :key="step.id"
        :name="step.id"
      >
        <template #title>
          <div class="step-title">
            <el-tag size="small" type="info">{{ step.order + 1 }}</el-tag>
            <el-tag size="small" :type="methodTagType(step.method)" style="margin-left:6px">{{ step.method }}</el-tag>
            <span style="margin-left:8px; font-size:13px; flex:1" :title="step.url">
              {{ step.step_name || step.url }}
            </span>
            <el-tag :type="statusTagType(step.status)" size="small" style="margin-right:8px">{{ step.status }}</el-tag>
            <span style="font-size:12px; color:var(--text-secondary); margin-right:12px">{{ step.duration_ms }}ms</span>
          </div>
        </template>

        <el-descriptions :column="2" border size="small" style="margin-bottom:10px">
          <el-descriptions-item label="URL" :span="2">
            <span style="word-break:break-all; font-size:12px">{{ step.url }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="HTTP状态码">{{ step.status_code ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ step.duration_ms }} ms</el-descriptions-item>
        </el-descriptions>

        <!-- 断言结果 -->
        <div v-if="step.assertion_results?.length" style="margin-bottom:10px">
          <div style="font-size:12px; font-weight:600; margin-bottom:6px; color:var(--text-regular)">断言结果</div>
          <el-table :data="step.assertion_results" size="small" border>
            <el-table-column prop="field" label="字段" width="160" />
            <el-table-column prop="operator" label="操作符" width="100" />
            <el-table-column prop="expected" label="期望值" />
            <el-table-column prop="actual" label="实际值" />
            <el-table-column label="结果" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.passed ? 'success' : 'danger'" size="small">
                  {{ row.passed ? '通过' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 请求/响应 -->
        <el-tabs size="small">
          <el-tab-pane v-if="step.request_body" label="请求体">
            <pre class="code-block">{{ step.request_body }}</pre>
          </el-tab-pane>
          <el-tab-pane label="响应体">
            <pre class="code-block">{{ step.response_body || '(空)' }}</pre>
          </el-tab-pane>
          <el-tab-pane v-if="step.error_message" label="错误信息">
            <pre class="code-block error">{{ step.error_message }}</pre>
          </el-tab-pane>
        </el-tabs>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
defineProps({ report: { type: Object, required: true } });

function statusTagType(s) {
  const map = {
    通过: 'success', 失败: 'danger', 执行中: 'warning', 未执行: 'info',
  };
  return map[s] || 'info';
}
function methodTagType(m) {
  const map = {
    GET: 'success', POST: 'primary', PUT: 'warning', PATCH: 'info', DELETE: 'danger',
  };
  return map[m?.toUpperCase()] || '';
}
</script>

<style scoped lang="scss">
.report-detail { padding: 4px; }
.step-title { display: flex; align-items: center; flex: 1; }
.code-block {
  background: var(--bg-hover);
  border-radius: 4px;
  padding: 10px;
  font-size: 12px;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  &.error { color: var(--el-color-danger); }
}
</style>
