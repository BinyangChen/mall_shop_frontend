<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Lock, Message, User } from '@element-plus/icons-vue';
import AuthShell from '@/components/AuthShell.vue';
import { useAuthStore } from '@/stores/auth';
import { safeRedirect } from '@/router/guards';
import type { RegisterBody } from '@/types/api';

interface RegisterForm extends RegisterBody {
  confirmPassword: string;
}

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive<RegisterForm>({
  username: '',
  email: '',
  displayName: '',
  password: '',
  confirmPassword: '',
});

const rules: FormRules<RegisterForm> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 30, message: '用户名长度为 3–30 位', trigger: 'blur' },
    {
      pattern: /^[A-Za-z0-9_]+$/,
      message: '仅支持字母、数字和下划线',
      trigger: 'blur',
    },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入合法的邮箱地址', trigger: 'blur' },
  ],
  displayName: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 30, message: '昵称不能超过 30 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 64, message: '密码长度为 8–64 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== form.password) {
          callback(new Error('两次输入的密码不一致'));
          return;
        }
        callback();
      },
      trigger: 'blur',
    },
  ],
};

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || submitting.value) return;
  submitting.value = true;
  try {
    const user = await auth.register({
      username: form.username.trim(),
      email: form.email.trim(),
      displayName: form.displayName.trim(),
      password: form.password,
    });
    ElMessage.success(`注册成功，欢迎你，${user.displayName}`);
    await router.replace(safeRedirect(route.query.redirect, '/'));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '注册失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <AuthShell mode="register">
    <div class="auth-heading">
      <span class="section-kicker">JOIN US</span>
      <h1>创建新账号</h1>
      <p>加入拾光集市，发现更多生活好物。</p>
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
      <div class="form-row">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="3–30 位字母数字"
            autocomplete="username"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item label="昵称" prop="displayName">
          <el-input
            v-model="form.displayName"
            placeholder="展示给其他人的名字"
            autocomplete="nickname"
          />
        </el-form-item>
      </div>

      <el-form-item label="邮箱" prop="email">
        <el-input
          v-model="form.email"
          placeholder="you@example.com"
          autocomplete="email"
          :prefix-icon="Message"
        />
      </el-form-item>

      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          placeholder="8–64 位密码"
          autocomplete="new-password"
          :prefix-icon="Lock"
        />
      </el-form-item>

      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          show-password
          placeholder="再次输入密码"
          autocomplete="new-password"
          :prefix-icon="Lock"
          @keyup.enter="submit"
        />
      </el-form-item>

      <p class="terms-note">注册即表示你同意本演示项目的服务条款与隐私说明。</p>

      <el-button
        type="primary"
        native-type="submit"
        class="submit-btn"
        :loading="submitting || auth.loading"
      >
        创建账号
      </el-button>
    </el-form>

    <p class="switch-line">
      已有账号？
      <RouterLink :to="{ path: '/login', query: route.query }">直接登录</RouterLink>
    </p>
  </AuthShell>
</template>

<style scoped>
.auth-heading {
  margin-bottom: 26px;
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
  margin-bottom: 17px;
}

.auth-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  font-size: 12.5px;
  font-weight: 600;
}

.auth-form :deep(.el-input__wrapper) {
  padding: 2px 14px;
  min-height: 44px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.terms-note {
  margin: -2px 0 17px;
  color: var(--muted);
  font-size: 10.5px;
  line-height: 1.5;
}

.submit-btn {
  width: 100%;
  height: 47px;
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

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
