<script setup lang="ts">
import { computed } from 'vue';
import { Check } from '@element-plus/icons-vue';
import type { Order } from '@/types/api';
import { formatDateTime } from '@/utils/format';

const props = defineProps<{ order: Order }>();

const stages = computed(() => [
  {
    title: '提交订单',
    description: '订单已创建',
    at: props.order.createdAt,
    done: true,
  },
  {
    title: '完成支付',
    description: props.order.paidAt ? '支付成功' : '等待支付',
    at: props.order.paidAt,
    done: Boolean(props.order.paidAt),
  },
  {
    title: '商品发货',
    description: props.order.shipment
      ? `${props.order.shipment.carrier} 已揽收`
      : '等待商家发货',
    at: props.order.shippedAt,
    done: Boolean(props.order.shippedAt),
  },
  {
    title: '订单完成',
    description: props.order.completedAt ? '交易完成' : '等待确认收货',
    at: props.order.completedAt,
    done: Boolean(props.order.completedAt),
  },
]);

const terminalNote = computed(() => {
  if (props.order.status === 'CANCELLED') {
    return `订单已于 ${formatDateTime(props.order.cancelledAt)} 取消`;
  }
  if (props.order.status === 'REFUNDING') {
    return '退款申请处理中，订单状态已暂停';
  }
  if (props.order.status === 'REFUNDED') {
    return `退款已于 ${formatDateTime(props.order.refundedAt)} 完成`;
  }
  return '';
});
</script>

<template>
  <div class="tracking-timeline">
    <div class="timeline-track">
      <div
        v-for="(stage, index) in stages"
        :key="stage.title"
        :class="['timeline-stage', { done: stage.done }]"
      >
        <div class="stage-marker">
          <el-icon v-if="stage.done"><Check /></el-icon>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="stage-copy">
          <strong>{{ stage.title }}</strong>
          <span>{{ stage.description }}</span>
          <time>{{ stage.at ? formatDateTime(stage.at) : '—' }}</time>
        </div>
        <div v-if="index < stages.length - 1" class="stage-line"></div>
      </div>
    </div>
    <div v-if="terminalNote" class="terminal-note">{{ terminalNote }}</div>
  </div>
</template>

<style scoped>
.timeline-track {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.timeline-stage {
  position: relative;
  min-width: 0;
}

.stage-marker {
  position: relative;
  z-index: 2;
  display: grid;
  width: 27px;
  height: 27px;
  color: #9b9a97;
  background: #f0ece6;
  border: 1px solid #e3ddd4;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 600;
  place-items: center;
}

.timeline-stage.done .stage-marker {
  color: #fff;
  background: var(--success);
  border-color: var(--success);
  box-shadow: 0 0 0 4px rgba(47, 143, 107, 0.09);
}

.stage-line {
  position: absolute;
  top: 13px;
  left: 27px;
  width: calc(100% - 27px);
  height: 1px;
  background: #e7e2db;
}

.timeline-stage.done .stage-line {
  background: #bcd9cc;
}

.stage-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px 0 0;
}

.stage-copy strong {
  font-size: 11.5px;
  font-weight: 600;
}

.stage-copy span {
  color: var(--muted);
  font-size: 9.5px;
}

.stage-copy time {
  margin-top: 2px;
  color: #b5aca1;
  font-size: 9px;
}

.terminal-note {
  padding: 9px 12px;
  margin-top: 17px;
  color: var(--muted);
  background: #faf7f2;
  border-radius: 7px;
  font-size: 10px;
}

@media (max-width: 680px) {
  .timeline-track {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .timeline-stage {
    display: grid;
    grid-template-columns: 27px 1fr;
    gap: 12px;
    min-height: 66px;
  }

  .stage-copy {
    padding: 2px 0 16px;
  }

  .stage-line {
    top: 27px;
    bottom: 0;
    left: 13px;
    width: 1px;
    height: auto;
  }
}
</style>
