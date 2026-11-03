<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ArrowLeft, Compass } from '@element-plus/icons-vue';

const router = useRouter();
</script>

<template>
  <div class="container page-shell not-found fade-page">
    <div class="not-found-inner">
      <span class="not-found-code">404</span>
      <div class="compass-icon">
        <el-icon><Compass /></el-icon>
      </div>
      <h1>这条小路走丢了</h1>
      <p>你访问的页面不存在，或者已经被移动到别处。</p>
      <div class="not-found-actions">
        <el-button type="primary" size="large" :icon="ArrowLeft" @click="router.push('/')">
          回到首页
        </el-button>
        <el-button size="large" @click="router.push('/products')">逛逛全部商品</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  min-height: 60vh;
  align-items: center;
  justify-content: center;
}

.not-found-inner {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 40px 24px;
  text-align: center;
}

.not-found-code {
  position: absolute;
  top: -26px;
  color: #eee8e0;
  font-family: var(--font-display);
  font-size: clamp(110px, 20vw, 190px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.06em;
  z-index: 0;
  user-select: none;
}

.compass-icon {
  position: relative;
  z-index: 1;
  display: grid;
  width: 66px;
  height: 66px;
  color: var(--brand);
  background: var(--brand-soft);
  border: 1px solid #f2d6c8;
  border-radius: 50%;
  font-size: 29px;
  place-items: center;
}

.not-found-inner h1 {
  position: relative;
  z-index: 1;
  margin-top: 22px;
  font-family: var(--font-display);
  font-size: clamp(29px, 4vw, 40px);
  font-weight: 600;
  letter-spacing: -0.03em;
}

.not-found-inner p {
  position: relative;
  z-index: 1;
  margin-top: 9px;
  color: var(--muted);
  font-size: 12.5px;
}

.not-found-actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 9px;
  margin-top: 26px;
}

.not-found-actions .el-button {
  margin: 0;
  border-radius: 8px;
}

@media (max-width: 480px) {
  .not-found-actions {
    width: 100%;
    flex-direction: column;
  }

  .not-found-actions .el-button {
    width: 100%;
  }
}
</style>
