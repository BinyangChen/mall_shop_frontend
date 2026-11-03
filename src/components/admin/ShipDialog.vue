<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { adminApi } from '@/api/admin';
import type { AdminOrderDetail, AdminOrderSummary } from '@/types/api';

interface ShipForm {
  carrier: string;
  trackingNo: string;
}

const props = defineProps<{
  modelValue: boolean;
  order: AdminOrderSummary | AdminOrderDetail | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  shipped: [];
}>();

const formRef = ref<FormInstance>();
const saving = ref(false);
const carriers = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '京东物流', '邮政EMS'];

const form = reactive<ShipForm>({
  carrier: '顺丰速运',
  trackingNo: '',
});

const rules: FormRules<ShipForm> = {
  carrier: [{ required: true, message: '请选择或填写承运商', trigger: 'change' }],
  trackingNo: [
    { required: true, message: '请输入运单号', trigger: 'blur' },
    { max: 50, message: '运单号不能超过 50 个字符', trigger: 'blur' },
  ],
};

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    form.carrier = '顺丰速运';
    form.trackingNo = '';
    formRef.value?.clearValidate();
  },
);

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || !props.order || saving.value) return;
  saving.value = true;
  try {
    await adminApi.orders.ship(props.order.id, {
      carrier: form.carrier.trim(),
      trackingNo: form.trackingNo.trim(),
    });
    ElMessage.success('订单已发货');
    emit('shipped');
    emit('update:modelValue', false);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发货失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="订单发货"
    width="480px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="order" class="ship-order-info">
      <span>订单号</span>
      <strong>{{ order.orderNo }}</strong>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item label="承运商" prop="carrier">
        <el-select
          v-model="form.carrier"
          filterable
          allow-create
          default-first-option
          placeholder="请选择或输入承运商"
          style="width: 100%"
        >
          <el-option v-for="carrier in carriers" :key="carrier" :label="carrier" :value="carrier" />
        </el-select>
      </el-form-item>
      <el-form-item label="运单号" prop="trackingNo">
        <el-input v-model="form.trackingNo" maxlength="50" placeholder="请输入物流运单号" />
      </el-form-item>
      <p class="form-hint">发货后订单状态将变为「待收货」，用户可查看运单信息。</p>
    </el-form>

    <template #footer>
      <el-button :disabled="saving" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">确认发货</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.ship-order-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 14px;
  margin-bottom: 17px;
  background: #faf7f2;
  border-radius: 8px;
  font-size: 10.5px;
}

.ship-order-info span {
  color: var(--muted);
}

.ship-order-info strong {
  font-family: monospace;
  font-size: 10.5px;
  font-weight: 500;
}
</style>
