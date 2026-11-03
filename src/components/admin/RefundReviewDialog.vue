<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi } from '@/api/admin';
import type { AdminRefundView } from '@/types/api';
import { formatCents } from '@/utils/money';
import { formatDateTime, REFUND_STATUS_META } from '@/utils/format';

const props = defineProps<{
  modelValue: boolean;
  refund: AdminRefundView | null;
  mode: 'approve' | 'reject';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  reviewed: [];
}>();

const comment = ref('');
const submitting = ref(false);

const isApprove = computed(() => props.mode === 'approve');
const title = computed(() => (isApprove.value ? '通过退款申请' : '拒绝退款申请'));

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) comment.value = '';
  },
);

async function submit(): Promise<void> {
  if (!props.refund || submitting.value) return;
  const text = comment.value.trim();
  if (!text) {
    ElMessage.warning('请填写审核备注');
    return;
  }
  submitting.value = true;
  try {
    if (isApprove.value) {
      await adminApi.refunds.approve(props.refund.id, { comment: text });
      ElMessage.success('退款申请已通过');
    } else {
      await adminApi.refunds.reject(props.refund.id, { comment: text });
      ElMessage.success('退款申请已拒绝');
    }
    emit('reviewed');
    emit('update:modelValue', false);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '退款审核失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="480px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="refund" class="refund-review">
      <div class="refund-overview">
        <div>
          <span>退款单号</span>
          <strong>#{{ refund.id }}</strong>
        </div>
        <div>
          <span>退款金额</span>
          <strong class="price">{{ formatCents(refund.amountCents) }}</strong>
        </div>
        <div>
          <span>当前状态</span>
          <el-tag
            :type="REFUND_STATUS_META[refund.status].type"
            size="small"
            effect="plain"
          >
            {{ REFUND_STATUS_META[refund.status].label }}
          </el-tag>
        </div>
      </div>

      <div class="refund-detail">
        <span>顾客</span>
        <strong>{{ refund.username }} · {{ refund.orderNo }}</strong>
        <span>申请时间</span>
        <strong>{{ formatDateTime(refund.createdAt) }}</strong>
        <span>退款原因</span>
        <strong>{{ refund.reason }}</strong>
      </div>

      <div v-if="refund.status === 'FAILED'" class="retry-note">
        该退款此前执行失败，通过后将重新尝试调用退款网关。
      </div>

      <label class="comment-label" for="admin-refund-comment">
        审核备注 <em>*</em>
      </label>
      <el-input
        id="admin-refund-comment"
        v-model="comment"
        type="textarea"
        :rows="3"
        maxlength="300"
        show-word-limit
        :placeholder="isApprove ? '请填写通过退款的原因或说明' : '请填写拒绝退款的原因'"
      />
    </div>

    <template #footer>
      <el-button :disabled="submitting" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button
        :type="isApprove ? 'primary' : 'danger'"
        :loading="submitting"
        @click="submit"
      >
        {{ isApprove ? '确认通过' : '确认拒绝' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.refund-overview {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  padding: 13px;
  margin-bottom: 14px;
  background: #faf7f2;
  border-radius: 9px;
}

.refund-overview > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.refund-overview span {
  color: var(--muted);
  font-size: 9px;
}

.refund-overview strong {
  font-size: 11.5px;
  font-weight: 500;
}

.refund-overview .price {
  color: var(--brand);
  font-size: 16px;
}

.refund-detail {
  display: grid;
  grid-template-columns: 65px 1fr;
  gap: 6px 10px;
  padding: 0 2px 14px;
  font-size: 10.5px;
}

.refund-detail span {
  color: var(--muted);
  font-size: 9.5px;
}

.refund-detail strong {
  color: var(--ink-soft);
  font-weight: 500;
  word-break: break-word;
}

.retry-note {
  padding: 8px 10px;
  margin-bottom: 13px;
  color: #8c4d1b;
  background: #fff7e8;
  border-radius: 7px;
  font-size: 9.5px;
}

.comment-label {
  display: block;
  margin-bottom: 6px;
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 500;
}

.comment-label em {
  color: var(--danger);
  font-style: normal;
}

@media (max-width: 480px) {
  .refund-overview {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
