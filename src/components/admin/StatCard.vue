<script setup lang="ts">
import type { Component } from 'vue';
import { DataLine } from '@element-plus/icons-vue';

withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    hint?: string;
    icon?: Component;
    tone?: 'brand' | 'navy' | 'green' | 'gold' | 'rose' | 'plain';
  }>(),
  {
    hint: '',
    icon: () => DataLine,
    tone: 'plain',
  },
);
</script>

<template>
  <div :class="['stat-card', `tone-${tone}`]">
    <div class="stat-card-top">
      <span class="stat-icon">
        <el-icon><component :is="icon" /></el-icon>
      </span>
      <span class="stat-label">{{ label }}</span>
    </div>
    <strong class="stat-value">{{ value }}</strong>
    <span v-if="hint" class="stat-hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.stat-card {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 18px;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.stat-card::after {
  position: absolute;
  right: -18px;
  bottom: -25px;
  width: 80px;
  height: 80px;
  border: 1px solid rgba(30, 36, 48, 0.035);
  border-radius: 50%;
  content: '';
}

.stat-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  display: grid;
  width: 28px;
  height: 28px;
  color: var(--ink-soft);
  background: #f6f2ec;
  border-radius: 7px;
  font-size: 14px;
  place-items: center;
}

.stat-label {
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 500;
}

.stat-value {
  margin-top: 15px;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 27px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  word-break: break-all;
}

.stat-hint {
  margin-top: 5px;
  color: var(--muted);
  font-size: 9.5px;
}

.tone-brand {
  background:
    radial-gradient(circle at 100% 0, rgba(232, 93, 42, 0.09), transparent 45%),
    #fff;
  border-color: #f0d8cb;
}

.tone-brand .stat-icon {
  color: var(--brand-strong);
  background: var(--brand-soft);
}

.tone-brand .stat-value {
  color: var(--brand-strong);
}

.tone-navy {
  background:
    radial-gradient(circle at 100% 0, rgba(255, 255, 255, 0.08), transparent 45%),
    var(--navy);
  border-color: var(--navy);
}

.tone-navy .stat-icon {
  color: #f0b28e;
  background: rgba(255, 255, 255, 0.08);
}

.tone-navy .stat-label,
.tone-navy .stat-hint {
  color: rgba(255, 255, 255, 0.45);
}

.tone-navy .stat-value {
  color: #fff;
}

.tone-green .stat-icon {
  color: #2f8f6b;
  background: #eaf5f0;
}

.tone-green .stat-value {
  color: #287a5c;
}

.tone-gold .stat-icon {
  color: #b27a12;
  background: #fbf3e2;
}

.tone-gold .stat-value {
  color: #a37113;
}

.tone-rose .stat-icon {
  color: #b4574f;
  background: #fbeeec;
}
</style>
