<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { reviewsApi } from '@/api/reviews';
import type { Order, OrderItem } from '@/types/api';
import { fallbackImage } from '@/utils/format';

const props = defineProps<{
  modelValue: boolean;
  order: Order | null;
  item: OrderItem | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submitted: [productId: number];
}>();

const rating = ref(5);
const content = ref('');
const submitting = ref(false);

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      rating.value = 5;
      content.value = '';
    }
  },
);

async function submit(): Promise<void> {
  if (!props.order || !props.item || submitting.value) return;
  if (!content.value.trim()) {
    ElMessage.warning('请填写评价内容');
    return;
  }
  submitting.value = true;
  try {
    await reviewsApi.create(props.order.id, {
      productId: props.item.productId,
      rating: rating.value,
      content: content.value.trim(),
    });
    ElMessage.success('评价已发布，感谢你的分享');
    emit('submitted', props.item.productId);
    emit('update:modelValue', false);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '评价提交失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="发表评价"
    width="500px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="order && item" class="review-dialog">
      <div class="review-product">
        <img :src="item.imageUrl || ''" :alt="item.productName" @error="fallbackImage" />
        <div>
          <strong>{{ item.productName }}</strong>
          <span>{{ order.orderNo }}</span>
        </div>
      </div>

      <div class="rating-block">
        <span>商品评分</span>
        <el-rate
          v-model="rating"
          :max="5"
          show-text
          :texts="['很差', '较差', '一般', '满意', '非常满意']"
          size="large"
        />
      </div>

      <label class="review-label" for="review-content">评价内容 <em>*</em></label>
      <el-input
        id="review-content"
        v-model="content"
        type="textarea"
        :rows="4"
        maxlength="500"
        show-word-limit
        placeholder="说说这件商品的使用感受，帮助更多人做出选择"
      />
      <p class="review-note">每个订单中的每件商品仅可评价一次，提交后不可修改。</p>
    </div>

    <template #footer>
      <el-button :disabled="submitting" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">发布评价</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.review-product {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px;
  margin-bottom: 17px;
  background: #faf7f2;
  border-radius: 9px;
}

.review-product img {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 7px;
}

.review-product strong {
  display: block;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-product span {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 9.5px;
}

.rating-block {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 4px 0 16px;
}

.rating-block > span {
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 500;
}

.review-label {
  display: block;
  margin-bottom: 7px;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 500;
}

.review-label em {
  color: var(--danger);
  font-style: normal;
}

.review-note {
  margin-top: 11px;
  color: var(--muted);
  font-size: 9.5px;
}

@media (max-width: 480px) {
  .rating-block {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
