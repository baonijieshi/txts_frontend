<template>
  <div class="wang-editor-wrap" :style="{ height: height + 'px' }">
    <Toolbar
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="default"
      class="wang-toolbar"
    />
    <Editor
      v-model="innerHtml"
      :default-config="editorConfig"
      mode="default"
      class="wang-body"
      @on-created="handleCreated"
    />
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import {
  ref, shallowRef, watch, onBeforeUnmount,
} from 'vue';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import '@wangeditor/editor/dist/css/style.css';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  height: {
    type: Number,
    default: 320,
  },
  placeholder: {
    type: String,
    default: '请输入内容...',
  },
});
const emits = defineEmits(['update:modelValue']);

const editorRef = shallowRef(null);
const innerHtml = ref(props.modelValue || '');

const toolbarConfig = {
  excludeKeys: ['uploadVideo', 'insertVideo', 'fullScreen', 'group-video'],
};

const editorConfig = {
  placeholder: props.placeholder,
  MENU_CONF: {
    uploadImage: {
      server: '/api/upload/image',
      fieldName: 'file',
      maxFileSize: 10 * 1024 * 1024,
      allowedFileTypes: ['image/*'],
      customInsert(res, insertFn) {
        insertFn(res.data.url, '', res.data.url);
      },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    },
  },
};

watch(
  () => props.modelValue,
  (val) => {
    if (val !== innerHtml.value) innerHtml.value = val || '';
  },
);

watch(innerHtml, (val) => {
  emits('update:modelValue', val);
});

function handleCreated(editor) {
  editorRef.value = editor;
}

onBeforeUnmount(() => {
  if (editorRef.value) editorRef.value.destroy();
});
</script>

<style scoped lang="scss">
.wang-editor-wrap {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;

  .wang-toolbar {
    border-bottom: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
  }

  .wang-body {
    flex: 1;
    overflow-y: auto;
  }
}
</style>
