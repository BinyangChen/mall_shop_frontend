<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { orderApi } from '@/api/orders';
import type { Order } from '@/types/api';
import { formatCents } from '@/utils/money';

const props = defineProps<{
  modelValue: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  refunded: [];
}>();

const reason = ref('');
const submitting = ref(false);

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) reason.value = '';
  },
);

async function submit(): Promise<void> {
  if (!props.order || submitting.value) return;
  const text = reason.value.trim();
  if (!text) {
    ElMessage.warning('请填写退款原因');
    return;
  }
  submitting.value = true;
  try {
    await orderApi.createRefund(props.order.id, { reason: text });
    ElMessage.success('退款申请已提交，请等待商家审核');
    emit('refunded');
    emit('update:modelValue', false);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '退款申请提交失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="申请退款"
    width="480px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="order" class="refund-dialog">
      <div class="refund-summary">
        <span>订单 {{ order.orderNo }}</span>
        <strong class="price">{{ formatCents(order.payableCents) }}</strong>
      </div>

      <label class="reason-label" for="refund-reason">退款原因 <em>*</em></label>
      <el-input
        id="refund-reason"
        v-model="reason"
        type="textarea"
        :rows="4"
        maxlength="300"
        show-word-limit
        placeholder="请简要说明申请退款的原因"
      />
      <p class="refund-note">
        当前为整单退款。提交后订单将进入退款处理中，审核结果以商家处理为准。
      </p>
    </div>

    <template #footer>
      <el-button :disabled="submitting" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交申请</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.refund-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 15px;
  margin-bottom: 18px;
  color: var(--muted);
  background: #faf7f2;
  border-radius: 9px;
  font-size: 10.5px;
}

.refund-summary .price {
  font-size: 19px;
}

.reason-label {
  display: block;
  margin-bottom: 7px;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 500;
}

.reason-label em {
  color: var(--danger);
  font-style: normal;
}

.refund-note {
  margin-top: 12px;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.65;
}
</style>
