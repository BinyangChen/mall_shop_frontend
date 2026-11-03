<script setup lang="ts">
import { Goods, House, ShoppingCart, Tickets, User } from '@element-plus/icons-vue';
import type { Component } from 'vue';
import { useRoute } from 'vue-router';
import { useCartStore } from '@/stores/cart';
import {
  MOBILE_TABS,
  isMobileTabActive,
  type MobileTabKey,
} from '@/utils/mobile';

const route = useRoute();
const cart = useCartStore();

const icons: Record<MobileTabKey, Component> = {
  home: House,
  products: Goods,
  cart: ShoppingCart,
  orders: Tickets,
  profile: User,
};

function isActive(key: MobileTabKey): boolean {
  return isMobileTabActive(route.path, key);
}
</script>

<template>
  <nav class="mobile-tab-bar" aria-label="移动端底部导航">
    <RouterLink
      v-for="tab in MOBILE_TABS"
      :key="tab.key"
      :to="tab.to"
      :class="['mobile-tab', { active: isActive(tab.key) }]"
      :aria-current="isActive(tab.key) ? 'page' : undefined"
      :aria-label="tab.key === 'cart' && cart.count > 0 ? `${tab.label}，${cart.count} 件商品` : tab.label"
    >
      <span class="tab-icon">
        <el-badge
          v-if="tab.key === 'cart'"
          :value="cart.count"
          :hidden="cart.count <= 0"
          :max="99"
          class="tab-badge"
        >
          <el-icon :size="21"><component :is="icons[tab.key]" /></el-icon>
        </el-badge>
        <el-icon v-else :size="21"><component :is="icons[tab.key]" /></el-icon>
      </span>
      <span class="tab-label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.mobile-tab-bar {
  display: none;
}

@media (max-width: 1023px) {
  .mobile-tab-bar {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 200;
    display: grid;
    padding: 5px max(8px, env(safe-area-inset-right))
      calc(5px + env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
    background: rgba(255, 255, 255, 0.94);
    border-top: 1px solid rgba(222, 215, 206, 0.7);
    box-shadow: 0 -8px 26px rgba(23, 32, 51, 0.08);
    grid-template-columns: repeat(5, minmax(0, 1fr));
    backdrop-filter: blur(16px) saturate(1.2);
    -webkit-backdrop-filter: blur(16px) saturate(1.2);
  }

  .mobile-tab {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 2px;
    padding: 4px 2px;
    color: var(--muted);
    border-radius: 10px;
    font-size: 10px;
    line-height: 1.15;
    transition:
      color 0.18s ease,
      background-color 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-tab:active {
    background: #f4efe8;
  }

  .mobile-tab.active {
    color: var(--brand-strong);
    background: var(--brand-wash);
    font-weight: 700;
  }

  .tab-icon {
    display: grid;
    height: 22px;
    place-items: center;
  }

  .tab-label {
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tab-badge {
    display: block;
  }

  .tab-badge :deep(.el-badge__content) {
    top: 1px;
    right: 8px;
    height: 16px;
    padding: 0 5px;
    border: 2px solid #fff;
    font-size: 9px;
    line-height: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-tab {
    transition: none;
  }
}
</style>
