<script setup lang="ts">
import { computed } from 'vue';
import type { Quote } from '@/types/api';
import { formatCents, formatCouponValue } from '@/utils/money';
import EmptyState from './EmptyState.vue';

const props = defineProps<{
  modelValue: boolean;
  quote: Quote | null;
  selectedId: number | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [userCouponId: number | null];
}>();

const coupons = computed(() => props.quote?.availableCoupons ?? []);

function choose(id: number | null): void {
  emit('select', id);
  emit('update:modelValue', false);
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="选择优惠券"
    width="520px"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="coupon-picker">
      <button
        type="button"
        :class="['no-coupon-option', { active: selectedId == null }]"
        @click="choose(null)"
      >
        <span>不使用优惠券</span>
        <span v-if="selectedId == null" class="selected-mark">当前选择</span>
      </button>

      <div v-if="coupons.length" class="coupon-list">
        <button
          v-for="coupon in coupons"
          :key="coupon.userCouponId"
          type="button"
          :class="[
            'coupon-option',
            { active: selectedId === coupon.userCouponId, disabled: !coupon.applicable },
          ]"
          :disabled="!coupon.applicable"
          @click="choose(coupon.userCouponId)"
        >
          <span class="coupon-value">
            <strong>{{ formatCouponValue(coupon.type, coupon.value) }}</strong>
            <small>满 {{ formatCents(coupon.minSpendCents) }} 可用</small>
          </span>
          <span class="coupon-copy">
            <strong>{{ coupon.name }}</strong>
            <small v-if="coupon.applicable">本单可减 {{ formatCents(coupon.discountCents) }}</small>
            <small v-else class="reason">{{ coupon.reason || '本单不可用' }}</small>
          </span>
          <span v-if="selectedId === coupon.userCouponId" class="coupon-check">✓</span>
        </button>
      </div>

      <EmptyState
        v-else
        compact
        title="暂无可用优惠券"
        description="可以前往个人中心查看已领取的优惠券。"
      />
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.coupon-picker {
  min-height: 120px;
}

.no-coupon-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 13px 16px;
  color: var(--ink-soft);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 9px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.18s ease;
}

.no-coupon-option.active {
  color: var(--brand-strong);
  background: var(--brand-wash);
  border-color: #efc3ae;
}

.selected-mark {
  color: var(--brand);
  font-size: 10px;
  font-weight: 600;
}

.coupon-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.coupon-option {
  position: relative;
  display: flex;
  width: 100%;
  overflow: hidden;
  align-items: stretch;
  text-align: left;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.coupon-option:hover:not(:disabled) {
  border-color: #edc5b2;
}

.coupon-option.active {
  background: var(--brand-wash);
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(232, 93, 42, 0.08);
}

.coupon-option.disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.coupon-value {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 118px;
  flex-direction: column;
  gap: 3px;
  padding: 16px 8px;
  color: var(--brand-strong);
  background: var(--brand-soft);
}

.coupon-value strong {
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 600;
}

.coupon-value small {
  color: #a87a63;
  font-size: 9px;
}

.coupon-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 14px 17px;
}

.coupon-copy strong {
  overflow: hidden;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-copy small {
  color: var(--success);
  font-size: 10px;
}

.coupon-copy small.reason {
  color: var(--muted);
}

.coupon-check {
  display: grid;
  width: 24px;
  margin-right: 14px;
  color: var(--brand);
  font-size: 15px;
  font-weight: 700;
  place-items: center;
}

@media (max-width: 480px) {
  .coupon-value {
    flex-basis: 100px;
  }

  .coupon-value strong {
    font-size: 18px;
  }
}
</style>
