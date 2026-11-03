<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Lock, User } from '@element-plus/icons-vue';
import AuthShell from '@/components/AuthShell.vue';
import { useAuthStore } from '@/stores/auth';
import { isAdminScope, showAdminConsole } from '@/config/scope';
import { safeRedirect } from '@/router/guards';

interface LoginForm {
  usernameOrEmail: string;
  password: string;
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive<LoginForm>({
  usernameOrEmail: '',
  password: '',
});

const rules: FormRules<LoginForm> = {
  usernameOrEmail: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码至少 8 位', trigger: 'blur' },
  ],
};

function fillDemo(role: 'customer' | 'admin'): void {
  if (role === 'admin') {
    form.usernameOrEmail = 'admin';
    form.password = 'Admin@12345';
  } else {
    form.usernameOrEmail = 'demo';
    form.password = 'Demo@12345';
  }
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    const user = await auth.login(form.usernameOrEmail.trim(), form.password);
    if (isAdminScope && user.role !== 'ADMIN') {
      await auth.logout();
      ElMessage.error('管理端仅限管理员账号登录');
      return;
    }
    ElMessage.success(`欢迎回来，${user.displayName}`);
    const fallback =
      isAdminScope || (showAdminConsole && user.role === 'ADMIN') ? '/admin' : '/';
    await router.replace(safeRedirect(route.query.redirect, fallback));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <AuthShell>
    <div class="auth-heading">
      <span class="section-kicker">{{ isAdminScope ? 'ADMIN CONSOLE' : 'WELCOME BACK' }}</span>
      <h1>{{ isAdminScope ? '管理后台' : '欢迎回来' }}</h1>
      <p>{{ isAdminScope ? '使用管理员账号登录运营后台。' : '登录后继续挑选你的心仪好物。' }}</p>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      size="large"
      class="auth-form"
      @submit.prevent="submit"
    >
      <el-form-item label="用户名 / 邮箱" prop="usernameOrEmail">
        <el-input
          v-model="form.usernameOrEmail"
          placeholder="请输入用户名或邮箱"
          autocomplete="username"
          :prefix-icon="User"
        />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          placeholder="请输入密码"
          autocomplete="current-password"
          :prefix-icon="Lock"
          @keyup.enter="submit"
        />
      </el-form-item>

      <el-button
        type="primary"
        native-type="submit"
        class="submit-btn"
        :loading="submitting || auth.loading"
      >
        登录
      </el-button>
    </el-form>

    <div class="demo-panel">
      <div class="demo-title">
        <span>演示账号</span>
        <small>点击自动填入</small>
      </div>
      <div class="demo-buttons">
        <button
          v-if="!isAdminScope"
          type="button"
          class="demo-btn"
          @click="fillDemo('customer')"
        >
          <span class="demo-avatar customer">顾</span>
          <span>
            <strong>演示顾客</strong>
            <small>demo / Demo@12345</small>
          </span>
        </button>
        <button type="button" class="demo-btn" @click="fillDemo('admin')">
          <span class="demo-avatar admin">管</span>
          <span>
            <strong>管理员</strong>
            <small>admin / Admin@12345</small>
          </span>
        </button>
      </div>
    </div>

    <p v-if="!isAdminScope" class="switch-line">
      还没有账号？
      <RouterLink :to="{ path: '/register', query: route.query }">立即注册</RouterLink>
    </p>
  </AuthShell>
</template>

<style scoped>
.auth-heading {
  margin-bottom: 30px;
}

.auth-heading h1 {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: 38px;
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.auth-heading p {
  margin-top: 9px;
  color: var(--muted);
  font-size: 13.5px;
}

.auth-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.auth-form :deep(.el-form-item__label) {
  padding-bottom: 7px;
  font-size: 12.5px;
  font-weight: 600;
}

.auth-form :deep(.el-input__wrapper) {
  padding: 2px 14px;
  min-height: 46px;
  background: rgba(255, 255, 255, 0.78);
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--line) inset;
}

.auth-form :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow:
    0 0 0 1px var(--brand) inset,
    0 0 0 3px rgba(232, 93, 42, 0.07);
}

.submit-btn {
  width: 100%;
  height: 47px;
  margin-top: 5px;
  color: #fff;
  background: var(--ink);
  border: 0;
  border-radius: 10px;
  font-size: 14px;
  letter-spacing: 0.06em;
}

.submit-btn:hover {
  background: var(--brand);
}

.demo-panel {
  padding: 15px;
  margin-top: 26px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px dashed var(--line-strong);
  border-radius: 12px;
}

.demo-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 600;
}

.demo-title small {
  color: var(--muted);
  font-size: 10px;
  font-weight: 400;
}

.demo-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.demo-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  text-align: left;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 9px;
  cursor: pointer;
  transition: border-color 0.18s ease;
}

.demo-btn:hover {
  border-color: #edc5b2;
}

.demo-avatar {
  display: grid;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  place-items: center;
}

.demo-avatar.customer {
  color: var(--brand-strong);
  background: var(--brand-soft);
}

.demo-avatar.admin {
  color: #fff;
  background: var(--navy);
}

.demo-btn strong {
  display: block;
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 600;
}

.demo-btn small {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 9px;
}

.switch-line {
  margin-top: 26px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.switch-line a {
  color: var(--brand);
  font-weight: 600;
}

.switch-line a:hover {
  text-decoration: underline;
}

@media (max-width: 960px) {
  .auth-heading h1 {
    font-size: 32px;
  }
}

@media (max-width: 400px) {
  .demo-buttons {
    grid-template-columns: 1fr;
  }
}
</style>
