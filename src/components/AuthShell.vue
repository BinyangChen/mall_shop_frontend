<script setup lang="ts">
import { ShoppingBag } from '@element-plus/icons-vue';

defineProps<{ mode?: 'login' | 'register' }>();
</script>

<template>
  <div class="auth-page">
    <aside class="auth-brand-panel">
      <RouterLink to="/" class="auth-logo">
        <span class="logo-mark">
          <el-icon :size="22"><ShoppingBag /></el-icon>
        </span>
        <span>拾光集市</span>
      </RouterLink>

      <div class="brand-message">
        <span class="brand-kicker">CURATED DAILY GOODS</span>
        <h1>把日常，<br />过成喜欢的样子。</h1>
        <p>从一件称心的小物开始，收藏生活里的微光。</p>
      </div>

      <div class="brand-visual" aria-hidden="true">
        <div class="orb orb-one"></div>
        <div class="orb orb-two"></div>
        <div class="mini-card mini-card-one">
          <span class="mini-dot"></span>
          <div>
            <strong>今日精选</strong>
            <small>认真挑选的好物</small>
          </div>
        </div>
        <div class="mini-card mini-card-two">
          <span class="mini-price">¥ 129</span>
          <small>生活美学</small>
        </div>
        <div class="quote-mark">“</div>
      </div>

      <p class="brand-foot">正品保障 · 安心下单 · 全程可查</p>
    </aside>

    <main class="auth-form-panel">
      <RouterLink to="/" class="mobile-logo">
        <span class="logo-mark small">
          <el-icon :size="17"><ShoppingBag /></el-icon>
        </span>
        <span>拾光集市</span>
      </RouterLink>
      <div class="auth-form-wrap">
        <slot />
      </div>
      <p class="legal-foot">© 2026 拾光集市 · 演示商城</p>
    </main>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  min-height: 100vh;
  background: var(--cream);
  grid-template-columns: minmax(400px, 0.92fr) minmax(460px, 1.08fr);
}

.auth-brand-panel {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  justify-content: space-between;
  padding: 42px 54px;
  color: #fff;
  background:
    radial-gradient(circle at 80% 16%, rgba(232, 93, 42, 0.22), transparent 32%),
    linear-gradient(152deg, #192337 0%, #172033 52%, #101725 100%);
}

.auth-brand-panel::after {
  position: absolute;
  right: -110px;
  bottom: -150px;
  width: 420px;
  height: 420px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 50%;
  content: '';
}

.auth-logo {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 11px;
  color: #fff;
  font-family: var(--font-display);
  font-size: 22px;
  letter-spacing: 0.03em;
}

.logo-mark {
  display: grid;
  width: 42px;
  height: 42px;
  color: #fff3e6;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 12px;
  place-items: center;
}

.logo-mark.small {
  width: 33px;
  height: 33px;
  color: #fff4e8;
  background: var(--navy);
  border: 0;
  border-radius: 9px;
}

.brand-message {
  position: relative;
  z-index: 2;
  max-width: 460px;
  margin-top: 28px;
}

.brand-kicker {
  color: #e9a17e;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.26em;
}

.brand-message h1 {
  margin-top: 18px;
  font-family: var(--font-display);
  font-size: clamp(38px, 4.4vw, 62px);
  font-weight: 600;
  line-height: 1.18;
  letter-spacing: -0.035em;
}

.brand-message p {
  max-width: 330px;
  margin-top: 22px;
  color: rgba(255, 255, 255, 0.56);
  font-size: 14px;
  line-height: 1.85;
}

.brand-visual {
  position: relative;
  z-index: 2;
  height: 160px;
  margin: 32px 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
}

.orb-one {
  top: 10px;
  left: 8%;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle at 35% 30%, #f6c29f, #d96a3f 60%, #8b3c22);
  opacity: 0.55;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
}

.orb-two {
  right: 9%;
  bottom: 0;
  width: 86px;
  height: 86px;
  background: radial-gradient(circle at 35% 30%, #c6d8cf, #64887a 65%, #334a40);
  opacity: 0.42;
}

.mini-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 16px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.94);
  border-radius: 12px;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.mini-card-one {
  top: 26px;
  left: 28%;
  min-width: 188px;
}

.mini-card-two {
  right: 18%;
  bottom: 6px;
  align-items: flex-start;
  flex-direction: column;
  gap: 3px;
  padding: 12px 18px;
}

.mini-dot {
  width: 27px;
  height: 27px;
  background: var(--brand-soft);
  border-radius: 50%;
}

.mini-card strong {
  display: block;
  font-size: 12px;
}

.mini-card small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.mini-price {
  color: var(--brand);
  font-size: 18px;
  font-weight: 700;
}

.quote-mark {
  position: absolute;
  top: 0;
  right: 3%;
  color: rgba(255, 255, 255, 0.08);
  font-family: var(--font-display);
  font-size: 190px;
  line-height: 0.8;
}

.brand-foot {
  position: relative;
  z-index: 2;
  color: rgba(255, 255, 255, 0.33);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.auth-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 48px 32px;
  background:
    radial-gradient(circle at 92% 8%, rgba(232, 93, 42, 0.07), transparent 24%),
    var(--cream);
}

.auth-form-wrap {
  width: min(420px, 100%);
  animation: formIn 0.45s ease both;
}

@keyframes formIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-logo {
  display: none;
}

.legal-foot {
  margin-top: 46px;
  color: var(--muted);
  font-size: 10.5px;
  letter-spacing: 0.04em;
}

@media (max-width: 960px) {
  .auth-page {
    grid-template-columns: 1fr;
  }

  .auth-brand-panel {
    display: none;
  }

  .auth-form-panel {
    min-height: 100vh;
    padding: 26px 20px;
  }

  .mobile-logo {
    display: flex;
    align-self: flex-start;
    align-items: center;
    gap: 9px;
    margin-bottom: 42px;
    font-family: var(--font-display);
    font-size: 19px;
    font-weight: 700;
  }

  .legal-foot {
    margin-top: 34px;
  }
}
</style>
