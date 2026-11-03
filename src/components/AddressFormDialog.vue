<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { addressApi } from '@/api/address';
import type { Address, AddressBody } from '@/types/api';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    address?: Address | null;
  }>(),
  { address: null },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [address: Address];
}>();

const formRef = ref<FormInstance>();
const saving = ref(false);

const initial = (): AddressBody => ({
  recipient: props.address?.recipient ?? '',
  phone: props.address?.phone ?? '',
  province: props.address?.province ?? '',
  city: props.address?.city ?? '',
  district: props.address?.district ?? '',
  detail: props.address?.detail ?? '',
  isDefault: props.address?.isDefault ?? false,
});

const form = reactive<AddressBody>(initial());
const isEdit = computed(() => Boolean(props.address?.id));
const title = computed(() => (isEdit.value ? '编辑收货地址' : '新增收货地址'));

const rules: FormRules<AddressBody> = {
  recipient: [
    { required: true, message: '请输入收货人', trigger: 'blur' },
    { max: 100, message: '不能超过 100 个字符', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入合法的 11 位手机号', trigger: 'blur' },
  ],
  province: [
    { required: true, message: '请输入省份', trigger: 'blur' },
    { max: 100, message: '不能超过 100 个字符', trigger: 'blur' },
  ],
  city: [
    { required: true, message: '请输入城市', trigger: 'blur' },
    { max: 100, message: '不能超过 100 个字符', trigger: 'blur' },
  ],
  district: [
    { required: true, message: '请输入区/县', trigger: 'blur' },
    { max: 100, message: '不能超过 100 个字符', trigger: 'blur' },
  ],
  detail: [
    { required: true, message: '请输入详细地址', trigger: 'blur' },
    { max: 100, message: '不能超过 100 个字符', trigger: 'blur' },
  ],
};

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    Object.assign(form, initial());
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
    const payload: AddressBody = {
      recipient: form.recipient.trim(),
      phone: form.phone.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      detail: form.detail.trim(),
      isDefault: form.isDefault,
    };
    const saved = props.address?.id
      ? await addressApi.update(props.address.id, payload)
      : await addressApi.create(payload);
    ElMessage.success(isEdit.value ? '地址已更新' : '地址已添加');
    emit('saved', saved);
    close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地址保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="560px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="address-form"
      @submit.prevent="save"
    >
      <div class="form-grid">
        <el-form-item label="收货人" prop="recipient">
          <el-input v-model="form.recipient" maxlength="100" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" maxlength="11" placeholder="11 位手机号" />
        </el-form-item>
      </div>

      <div class="form-grid three">
        <el-form-item label="省份" prop="province">
          <el-input v-model="form.province" maxlength="100" placeholder="如：浙江省" />
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="form.city" maxlength="100" placeholder="如：杭州市" />
        </el-form-item>
        <el-form-item label="区 / 县" prop="district">
          <el-input v-model="form.district" maxlength="100" placeholder="如：西湖区" />
        </el-form-item>
      </div>

      <el-form-item label="详细地址" prop="detail">
        <el-input
          v-model="form.detail"
          type="textarea"
          :rows="3"
          maxlength="100"
          show-word-limit
          placeholder="街道、门牌号、楼层、房间号等"
        />
      </el-form-item>

      <div class="default-row">
        <div>
          <strong>设为默认地址</strong>
          <span>结算时优先使用这个地址</span>
        </div>
        <el-switch v-model="form.isDefault" />
      </div>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">
        {{ isEdit ? '保存修改' : '保存地址' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid.three {
  grid-template-columns: 1.2fr 1.2fr 1fr;
}

.address-form :deep(.el-form-item) {
  margin-bottom: 15px;
}

.address-form :deep(.el-form-item__label) {
  padding-bottom: 5px;
  font-size: 12px;
}

.default-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 15px;
  margin-top: 4px;
  background: #faf7f2;
  border-radius: 9px;
}

.default-row strong {
  display: block;
  font-size: 12.5px;
}

.default-row span {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 10.5px;
}

@media (max-width: 560px) {
  .form-grid,
  .form-grid.three {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
