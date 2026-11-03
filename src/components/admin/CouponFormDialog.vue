<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { adminApi } from '@/api/admin';
import type { CouponStatus, CouponTemplateView, CouponType } from '@/types/api';
import { centsToYuan, yuanToCents } from '@/utils/money';

interface CouponForm {
  code: string;
  name: string;
  type: CouponType;
  valueYuan: string;
  valuePercent: number;
  minSpendYuan: string;
  totalQuantity: number;
  perUserLimit: number;
  validFrom: string;
  validTo: string;
  status: CouponStatus;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    coupon?: CouponTemplateView | null;
  }>(),
  { coupon: null },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
}>();

const formRef = ref<FormInstance>();
const saving = ref(false);
const isEdit = computed(() => Boolean(props.coupon?.id));

const emptyForm = (): CouponForm => ({
  code: '',
  name: '',
  type: 'FIXED',
  valueYuan: '',
  valuePercent: 10,
  minSpendYuan: '0.00',
  totalQuantity: 100,
  perUserLimit: 1,
  validFrom: '',
  validTo: '',
  status: 'ACTIVE',
});

const form = reactive<CouponForm>(emptyForm());

const rules: FormRules<CouponForm> = {
  code: [
    { required: true, message: '请输入优惠券编码', trigger: 'blur' },
    {
      pattern: /^[A-Za-z0-9_-]{2,50}$/,
      message: '编码为 2–50 位字母、数字、下划线或短横线',
      trigger: 'blur',
    },
  ],
  name: [
    { required: true, message: '请输入优惠券名称', trigger: 'blur' },
    { max: 100, message: '名称不能超过 100 个字符', trigger: 'blur' },
  ],
  totalQuantity: [{ required: true, message: '请输入发放总量', trigger: 'change' }],
  perUserLimit: [{ required: true, message: '请输入每人限领数量', trigger: 'change' }],
  validFrom: [{ required: true, message: '请选择生效时间', trigger: 'change' }],
  validTo: [
    { required: true, message: '请选择失效时间', trigger: 'change' },
    {
      validator: (_rule, value: string, callback) => {
        if (value && form.validFrom && new Date(value).getTime() <= new Date(form.validFrom).getTime()) {
          callback(new Error('失效时间必须晚于生效时间'));
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
};

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    const source = props.coupon;
    Object.assign(form, {
      code: source?.code ?? '',
      name: source?.name ?? '',
      type: source?.type ?? 'FIXED',
      valueYuan: source?.type === 'FIXED' ? centsToYuan(source.value) : '',
      valuePercent: source?.type === 'PERCENT' ? source.value / 100 : 10,
      minSpendYuan: centsToYuan(source?.minSpendCents ?? 0),
      totalQuantity: source?.totalQuantity ?? 100,
      perUserLimit: source?.perUserLimit ?? 1,
      validFrom: source?.validFrom ?? '',
      validTo: source?.validTo ?? '',
      status: source?.status ?? 'ACTIVE',
    });
    formRef.value?.clearValidate();
  },
);

function close(): void {
  emit('update:modelValue', false);
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || saving.value) return;

  let value = 0;
  if (form.type === 'FIXED') {
    const cents = yuanToCents(form.valueYuan);
    if (cents === null || cents <= 0) {
      ElMessage.error('请输入大于 0 的固定面额');
      return;
    }
    value = cents;
  } else {
    if (!Number.isFinite(form.valuePercent) || form.valuePercent <= 0) {
      ElMessage.error('请输入大于 0 的折扣百分比');
      return;
    }
    value = Math.round(form.valuePercent * 100);
    if (value > 10000) {
      ElMessage.error('折扣比例不能超过 100%');
      return;
    }
  }

  const minSpendCents = yuanToCents(form.minSpendYuan);
  if (minSpendCents === null || minSpendCents < 0) {
    ElMessage.error('请输入合法的使用门槛');
    return;
  }
  if (new Date(form.validTo).getTime() <= new Date(form.validFrom).getTime()) {
    ElMessage.error('失效时间必须晚于生效时间');
    return;
  }
  if (form.perUserLimit > form.totalQuantity) {
    ElMessage.error('每人限领数量不能超过发放总量');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      value,
      minSpendCents,
      totalQuantity: Math.floor(form.totalQuantity),
      perUserLimit: Math.floor(form.perUserLimit),
      validFrom: form.validFrom,
      validTo: form.validTo,
      status: form.status,
    };
    if (props.coupon?.id) {
      // 契约要求 PUT 与 POST 使用相同 body；code 在编辑态只读且后端不会修改它。
      await adminApi.coupons.update(props.coupon.id, payload);
      ElMessage.success('优惠券已更新');
    } else {
      await adminApi.coupons.create(payload);
      ElMessage.success('优惠券已创建');
    }
    emit('saved');
    close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '优惠券保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑优惠券' : '新建优惠券'"
    width="640px"
    append-to-body
    :close-on-click-modal="false"
    top="5vh"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="coupon-form"
      @submit.prevent="save"
    >
      <div class="form-grid">
        <el-form-item label="优惠券编码" prop="code">
          <el-input
            v-model="form.code"
            :disabled="isEdit"
            maxlength="50"
            placeholder="如：WELCOME10"
          />
          <p v-if="isEdit" class="form-hint">编码创建后不可修改</p>
        </el-form-item>
        <el-form-item label="优惠券名称" prop="name">
          <el-input v-model="form.name" maxlength="100" placeholder="如：新人立减券" />
        </el-form-item>
      </div>

      <div class="type-block">
        <span class="type-label">优惠类型</span>
        <el-radio-group v-model="form.type">
          <el-radio-button value="FIXED">固定金额</el-radio-button>
          <el-radio-button value="PERCENT">折扣比例</el-radio-button>
        </el-radio-group>
      </div>

      <div class="form-grid">
        <el-form-item
          v-if="form.type === 'FIXED'"
          label="优惠面额（元）"
          prop="valueYuan"
          :rules="[
            { required: true, message: '请输入优惠面额', trigger: 'blur' },
          ]"
        >
          <el-input v-model="form.valueYuan" placeholder="0.00">
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item v-else label="折扣比例（%）">
          <el-input-number
            v-model="form.valuePercent"
            :min="0.01"
            :max="100"
            :precision="2"
            :step="1"
            controls-position="right"
            style="width: 100%"
          />
          <p class="form-hint">
            将以基点存储（{{ Math.round(form.valuePercent * 100) }} 基点），最高 100%
          </p>
        </el-form-item>

        <el-form-item label="使用门槛（元）">
          <el-input v-model="form.minSpendYuan" placeholder="0.00">
            <template #prepend>¥</template>
          </el-input>
          <p class="form-hint">订单商品总额达到该金额方可使用</p>
        </el-form-item>

        <el-form-item label="发放总量" prop="totalQuantity">
          <el-input-number
            v-model="form.totalQuantity"
            :min="1"
            :max="999999"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="每人限领" prop="perUserLimit">
          <el-input-number
            v-model="form.perUserLimit"
            :min="1"
            :max="99"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="生效时间" prop="validFrom">
          <el-date-picker
            v-model="form.validFrom"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="选择开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="失效时间" prop="validTo">
          <el-date-picker
            v-model="form.validTo"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="选择结束时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="DISABLED" />
          </el-select>
        </el-form-item>
      </div>

      <p class="form-hint basis-hint">
        折扣券 value 以基点保存（1000 基点 = 10% 折扣）；折后应付最低 1 分，由服务端计算。
      </p>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">
        {{ isEdit ? '保存修改' : '创建优惠券' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.coupon-form :deep(.el-form-item) {
  margin-bottom: 15px;
}

.coupon-form :deep(.el-form-item__label) {
  padding-bottom: 5px;
  font-size: 11.5px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 13px;
}

.type-block {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  margin-bottom: 15px;
  background: #faf7f2;
  border-radius: 9px;
}

.type-label {
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 600;
}

.basis-hint {
  padding: 9px 11px;
  margin-top: 3px;
  background: #fbf9f5;
  border-radius: 7px;
}

@media (max-width: 560px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .type-block {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }
}
</style>
