<script setup lang="ts">
import { computed } from 'vue';
import { StarFilled } from '@element-plus/icons-vue';

const props = withDefaults(
  defineProps<{
    rating: number;
    count?: number | null;
    showValue?: boolean;
    size?: number;
  }>(),
  { count: null, showValue: true, size: 13 },
);

const filledCount = computed(() => Math.round(Math.max(0, Math.min(5, props.rating))));
</script>

<template>
  <span class="rating" :aria-label="`评分 ${rating.toFixed(1)} 分`">
    <span class="stars" :style="{ fontSize: `${size}px` }">
      <el-icon
        v-for="index in 5"
        :key="index"
        :class="['star', { filled: index <= filledCount }]"
      >
        <StarFilled />
      </el-icon>
    </span>
    <span v-if="showValue" class="rating-value">{{ rating > 0 ? rating.toFixed(1) : '暂无' }}</span>
    <span v-if="count != null" class="rating-count">({{ count }})</span>
  </span>
</template>

<style scoped>
.rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.stars {
  display: inline-flex;
  gap: 1px;
  line-height: 1;
}

.star {
  color: #ddd6cc;
}

.star.filled {
  color: #e7a33b;
}

.rating-value {
  color: var(--ink-soft);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.rating-count {
  color: var(--muted);
}
</style>
