<script setup lang="ts">
withDefaults(
  defineProps<{
    ariaLabel?: string;
  }>(),
  { ariaLabel: '页面操作' },
);
</script>

<template>
  <Teleport to="body">
    <div class="mobile-action-bar" role="region" :aria-label="ariaLabel">
      <div class="mobile-action-inner">
        <div class="mobile-action-info">
          <slot name="info" />
        </div>
        <div class="mobile-action-buttons">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mobile-action-bar {
  display: none;
}

@media (max-width: 768px) {
  .mobile-action-bar {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 220;
    display: block;
    padding: 10px max(14px, env(safe-area-inset-right))
      calc(10px + env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
    background: rgba(255, 255, 255, 0.97);
    border-top: 1px solid var(--line);
    box-shadow: 0 -10px 30px rgba(23, 32, 51, 0.1);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .mobile-action-inner {
    display: flex;
    min-height: 48px;
    align-items: center;
    gap: 10px;
  }

  .mobile-action-info {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 1px;
    color: var(--muted);
    font-size: 10.5px;
    line-height: 1.2;
  }

  .mobile-action-info :deep(.price),
  .mobile-action-info :deep(strong) {
    color: var(--brand-strong);
    font-size: 20px;
    font-weight: 700;
    line-height: 1.1;
  }

  .mobile-action-buttons {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .mobile-action-buttons :deep(.el-button) {
    height: 44px;
    padding: 0 16px;
    margin: 0;
    border-radius: 10px;
    font-size: 13px;
  }

  .mobile-action-buttons :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .mobile-action-inner {
    flex-wrap: wrap;
    row-gap: 8px;
  }

  .mobile-action-info {
    flex: 1 1 auto;
  }

  .mobile-action-buttons {
    flex: 1 1 100%;
    margin-left: 0;
  }

  .mobile-action-buttons :deep(.el-button) {
    flex: 1;
  }
}

@media (max-width: 380px) {
  .mobile-action-info :deep(.price),
  .mobile-action-info :deep(strong) {
    font-size: 18px;
  }

  .mobile-action-buttons :deep(.el-button) {
    padding: 0 11px;
    font-size: 12px;
  }
}
</style>
