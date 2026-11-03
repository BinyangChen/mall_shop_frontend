<script setup lang="ts">
import { Box } from '@element-plus/icons-vue';

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    compact?: boolean;
  }>(),
  {
    title: '这里还空空如也',
    description: '',
    compact: false,
  },
);
</script>

<template>
  <div :class="['empty-state', { compact }]">
    <div class="empty-icon">
      <slot name="icon">
        <el-icon :size="compact ? 24 : 32"><Box /></el-icon>
      </slot>
    </div>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  text-align: center;
}

.empty-state.compact {
  padding: 34px 16px;
}

.empty-icon {
  display: grid;
  width: 68px;
  height: 68px;
  margin-bottom: 16px;
  color: #b9afa2;
  background: #f4f0ea;
  border-radius: 50%;
  place-items: center;
}

.compact .empty-icon {
  width: 52px;
  height: 52px;
  margin-bottom: 12px;
}

h3 {
  font-size: 16px;
  font-weight: 700;
}

p {
  max-width: 420px;
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.empty-action {
  margin-top: 20px;
}
</style>
