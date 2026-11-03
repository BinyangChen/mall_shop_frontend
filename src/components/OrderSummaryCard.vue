<script setup lang="ts">
import { formatCents } from '@/utils/money';

withDefaults(
  defineProps<{
    itemTotalCents: number;
    discountCents: number;
    payableCents: number;
    couponName?: string | null;
    submitText?: string;
    submitDisabled?: boolean;
    loading?: boolean;
    showSubmit?: boolean;
  }>(),
  {
    couponName: null,
    submitText: '提交订单',
    submitDisabled: false,
    loading: false,
    showSubmit: true,
  },
);

defineEmits<{ submit: [] }>();
</script>

<template>
  <div class="order-summary-card surface-card">
    <h2>订单金额</h2>
    <div class="money-row">
      <span>商品合计</span>
      <strong>{{ formatCents(itemTotalCents) }}</strong>
    </div>
    <div class="money-row">
      <span>优惠券</span>
      <span v-if="discountCents > 0" class="discount">
        {{ couponName || '优惠券' }} −{{ formatCents(discountCents) }}
      </span>
      <span v-else class="text-muted">未使用</span>
    </div>
    <div class="money-row total">
      <span>应付金额</span>
      <span class="price">{{ formatCents(payableCents) }}</span>
    </div>

    <slot name="extra" />

    <el-button
      v-if="showSubmit"
      type="primary"
      size="large"
      class="submit-btn"
      :disabled="submitDisabled"
      :loading="loading"
      @click="$emit('submit')"
    >
      {{ submitText }}
    </el-button>
    <p v-if="showSubmit" class="summary-tip">
      提交即代表确认商品与收货信息，金额以服务端最终计算为准。
    </p>
  </div>
</template>

<style scoped>
.order-summary-card {
  padding: 23px;
}

h2 {
  margin-bottom: 12px;
  font-size: 17px;
  font-weight: 700;
}

.discount {
  color: var(--brand);
  font-weight: 500;
}

.submit-btn {
  width: 100%;
  height: 47px;
  margin-top: 19px;
  border-radius: 9px;
}

.summary-tip {
  margin-top: 10px;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.6;
  text-align: center;
}
</style>
