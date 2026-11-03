<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { adminApi } from '@/api/admin';
import type { Category, CategoryStatus } from '@/types/api';

interface CategoryForm {
  name: string;
  sortOrder: number;
  status: CategoryStatus;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    category?: Category | null;
  }>(),
  { category: null },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
}>();

const formRef = ref<FormInstance>();
const saving = ref(false);
const isEdit = computed(() => Boolean(props.category?.id));

const form = reactive<CategoryForm>({
  name: '',
  sortOrder: 1,
  status: 'ACTIVE',
});

const rules: FormRules<CategoryForm> = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 50, message: '分类名称不能超过 50 个字符', trigger: 'blur' },
  ],
  sortOrder: [{ required: true, message: '请输入排序值', trigger: 'change' }],
};

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    form.name = props.category?.name ?? '';
    form.sortOrder = props.category?.sortOrder ?? 1;
    form.status = (props.category?.status as CategoryStatus) ?? 'ACTIVE';
    formRef.value?.clearValidate();
  },
);

function close(): void {
  emit('update:modelValue', false);
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || saving.value) return;
  saving.value = true;
  try {
    if (props.category?.id) {
      await adminApi.categories.update(props.category.id, {
        name: form.name.trim(),
        sortOrder: form.sortOrder,
        status: form.status,
      });
      ElMessage.success('分类已更新');
    } else {
      await adminApi.categories.create({
        name: form.name.trim(),
        sortOrder: form.sortOrder,
      });
      ElMessage.success('分类已创建');
    }
    emit('saved');
    close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '分类保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑分类' : '新增分类'"
    width="440px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="save"
    >
      <el-form-item label="分类名称" prop="name">
        <el-input v-model="form.name" maxlength="50" placeholder="如：家居生活" />
      </el-form-item>
      <div class="category-form-row">
        <el-form-item label="排序值" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
        <el-form-item v-if="isEdit" label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="DISABLED" />
          </el-select>
        </el-form-item>
      </div>
      <p class="form-hint">排序值越小越靠前；分类下仍有商品时无法删除。</p>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.category-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.category-form-row :deep(.el-input-number) {
  width: 100%;
}

@media (max-width: 480px) {
  .category-form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
