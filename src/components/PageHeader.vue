<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    kicker?: string;
  }>(),
  { description: '', kicker: '' },
);
</script>

<template>
  <header class="page-header">
    <div class="page-header-copy">
      <span v-if="kicker" class="section-kicker">{{ kicker }}</span>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 26px;
}

.page-header-copy {
  min-width: 0;
}

h1 {
  margin-top: 3px;
  font-family: var(--font-display);
  font-size: clamp(27px, 3vw, 38px);
  line-height: 1.2;
  letter-spacing: -0.025em;
}

p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 14px;
}

.page-header-actions {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
}

@media (max-width: 640px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 18px;
  }

  .page-header-actions {
    width: 100%;
  }
}
</style>
