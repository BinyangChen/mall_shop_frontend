<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Wallet } from '@element-plus/icons-vue';
import { paymentApi } from '@/api/payments';
import type { Order, PaymentChannel } from '@/types/api';
import { formatCents } from '@/utils/money';

const props = defineProps<{
  modelValue: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  paid: [];
}>();

const channel = ref<PaymentChannel>('MOCK');
const paying = ref(false);

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) channel.value = 'MOCK';
  },
);

function close(): void {
  if (!paying.value) emit('update:modelValue', false);
}

async function pay(): Promise<void> {
  if (!props.order || paying.value) return;
  paying.value = true;
  try {
    const payment = await paymentApi.createForOrder(props.order.id, { channel: channel.value });

    if (payment.channel === 'ALIPAY') {
      if (!payment.payUrl) {
        ElMessage.error('未获取到支付宝收银台地址');
        return;
      }
      const opened = window.open(payment.payUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.location.href = payment.payUrl;
      } else {
        ElMessage.success('已打开支付宝收银台，请在新窗口完成支付');
        emit('update:modelValue', false);
      }
      return;
    }

    if (payment.status === 'SUCCEEDED') {
      ElMessage.success('支付成功');
      emit('paid');
      emit('update:modelValue', false);
      return;
    }

    await paymentApi.mockConfirm(payment.id);
    ElMessage.success('模拟支付成功');
    emit('paid');
    emit('update:modelValue', false);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '支付发起失败');
  } finally {
    paying.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="完成支付"
    width="470px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!paying"
    :show-close="!paying"
    @update:model-value="!paying && emit('update:modelValue', $event)"
  >
    <div v-if="order" class="payment-dialog">
      <div class="payment-amount">
        <span>本次应付</span>
        <strong class="price">{{ formatCents(order.payableCents) }}</strong>
        <small>订单号 {{ order.orderNo }}</small>
      </div>

      <div class="channel-list">
        <button
          type="button"
          :class="['channel-card', { active: channel === 'MOCK' }]"
          @click="channel = 'MOCK'"
        >
          <span class="channel-icon mock"><el-icon><Wallet /></el-icon></span>
          <span class="channel-copy">
            <strong>模拟支付</strong>
            <small>演示环境推荐，点击即刻完成</small>
          </span>
          <span class="channel-radio"><i v-if="channel === 'MOCK'"></i></span>
        </button>
        <button
          type="button"
          :class="['channel-card', { active: channel === 'ALIPAY' }]"
          @click="channel = 'ALIPAY'"
        >
          <span class="channel-icon alipay">支</span>
          <span class="channel-copy">
            <strong>支付宝沙箱</strong>
            <small>将跳转至支付宝收银台完成支付</small>
          </span>
          <span class="channel-radio"><i v-if="channel === 'ALIPAY'"></i></span>
        </button>
      </div>

      <p class="payment-note">
        支付结果以服务端确认为准。若已打开新窗口，请完成支付后返回订单页刷新。
      </p>
    </div>

    <template #footer>
      <el-button :disabled="paying" @click="close">稍后支付</el-button>
      <el-button type="primary" :loading="paying" @click="pay">
        {{ channel === 'MOCK' ? '确认模拟支付' : '前往支付宝' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.payment-dialog {
  padding-top: 1px;
}

.payment-amount {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 18px 14px;
  background:
    radial-gradient(circle at 20% 10%, rgba(232, 93, 42, 0.08), transparent 55%),
    #faf7f2;
  border-radius: 11px;
}

.payment-amount span {
  color: var(--muted);
  font-size: 10.5px;
}

.payment-amount strong {
  margin-top: 3px;
  font-size: 34px;
  line-height: 1.3;
}

.payment-amount small {
  margin-top: 5px;
  color: var(--muted);
  font-size: 9.5px;
}

.channel-list {
  display: grid;
  gap: 9px;
  margin-top: 17px;
}

.channel-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 15px;
  text-align: left;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.channel-card:hover {
  border-color: #edc5b2;
}

.channel-card.active {
  background: var(--brand-wash);
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(232, 93, 42, 0.06);
}

.channel-icon {
  display: grid;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 700;
  place-items: center;
}

.channel-icon.mock {
  color: #4e6d67;
  background: #eaf1ee;
}

.channel-icon.alipay {
  color: #fff;
  background: #1677ff;
  font-size: 13px;
}

.channel-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.channel-copy strong {
  font-size: 12.5px;
  font-weight: 600;
}

.channel-copy small {
  color: var(--muted);
  font-size: 9.5px;
}

.channel-radio {
  display: grid;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1px solid #cbc3b9;
  border-radius: 50%;
  place-items: center;
}

.channel-card.active .channel-radio {
  border-color: var(--brand);
}

.channel-radio i {
  width: 8px;
  height: 8px;
  background: var(--brand);
  border-radius: 50%;
}

.payment-note {
  margin-top: 15px;
  color: var(--muted);
  font-size: 9.5px;
  line-height: 1.6;
  text-align: center;
}
</style>
