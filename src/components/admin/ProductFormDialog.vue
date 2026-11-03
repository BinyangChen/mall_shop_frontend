<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { adminApi } from '@/api/admin';
import type { AdminProductDetail, Category, ProductStatus } from '@/types/api';
import { centsToYuan, yuanToCents } from '@/utils/money';

interface ProductForm {
  categoryId: number | undefined;
  title: string;
  subtitle: string;
  description: string;
  priceYuan: string;
  originalPriceYuan: string;
  imageUrl: string;
  imagesText: string;
  status: ProductStatus;
  stock: number;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    product?: AdminProductDetail | null;
    categories: Category[];
  }>(),
  { product: null },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
}>();

const formRef = ref<FormInstance>();
const saving = ref(false);
const isEdit = computed(() => Boolean(props.product?.id));

const emptyForm = (): ProductForm => ({
  categoryId: props.categories[0]?.id,
  title: '',
  subtitle: '',
  description: '',
  priceYuan: '',
  originalPriceYuan: '',
  imageUrl: '',
  imagesText: '',
  status: 'ON_SALE',
  stock: 0,
});

const form = reactive<ProductForm>(emptyForm());

const optionalPriceValidator = (
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void => {
  if (!value.trim()) {
    callback();
    return;
  }
  const cents = yuanToCents(value);
  if (cents === null || cents <= 0) {
    callback(new Error('请输入大于 0 的合法金额'));
    return;
  }
  callback();
};

const rules: FormRules<ProductForm> = {
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  title: [
    { required: true, message: '请输入商品标题', trigger: 'blur' },
    { max: 100, message: '标题不能超过 100 个字符', trigger: 'blur' },
  ],
  subtitle: [{ max: 200, message: '副标题不能超过 200 个字符', trigger: 'blur' }],
  description: [{ required: true, message: '请输入商品描述', trigger: 'blur' }],
  priceYuan: [
    { required: true, message: '请输入售价', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        const cents = yuanToCents(value);
        if (cents === null || cents <= 0) callback(new Error('请输入大于 0 的合法金额'));
        else callback();
      },
      trigger: 'blur',
    },
  ],
  originalPriceYuan: [{ validator: optionalPriceValidator, trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'change' }],
};

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    const source = props.product;
    Object.assign(form, {
      categoryId: source?.categoryId ?? props.categories[0]?.id,
      title: source?.title ?? '',
      subtitle: source?.subtitle ?? '',
      description: source?.description ?? '',
      priceYuan: source ? centsToYuan(source.priceCents) : '',
      originalPriceYuan: source?.originalPriceCents
        ? centsToYuan(source.originalPriceCents)
        : '',
      imageUrl: source?.imageUrl ?? '',
      imagesText: source?.images?.join('\n') ?? '',
      status: source?.status ?? 'ON_SALE',
      stock: source?.stock ?? 0,
    });
    formRef.value?.clearValidate();
  },
);

function close(): void {
  emit('update:modelValue', false);
}

function collectImages(): string[] {
  const parsed = form.imagesText
    .split(/[\n,，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const primary = form.imageUrl.trim();
  return Array.from(new Set([...(primary ? [primary] : []), ...parsed]));
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || saving.value) return;

  const priceCents = yuanToCents(form.priceYuan);
  if (priceCents === null || priceCents <= 0) {
    ElMessage.error('售价格式不正确');
    return;
  }
  const originalPriceCents = form.originalPriceYuan.trim()
    ? yuanToCents(form.originalPriceYuan)
    : null;
  if (originalPriceCents === null && form.originalPriceYuan.trim()) {
    ElMessage.error('原价格式不正确');
    return;
  }

  saving.value = true;
  try {
    const images = collectImages();
    const imageUrl = form.imageUrl.trim() || images[0] || null;
    const payload = {
      categoryId: Number(form.categoryId),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim(),
      priceCents,
      originalPriceCents,
      imageUrl,
      images,
      status: form.status,
    };
    if (props.product?.id) {
      await adminApi.products.update(props.product.id, payload);
      ElMessage.success('商品已更新');
    } else {
      await adminApi.products.create({
        ...payload,
        stock: Math.max(0, Math.floor(form.stock)),
      });
      ElMessage.success('商品已创建');
    }
    emit('saved');
    close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '商品保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑商品' : '新增商品'"
    width="720px"
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
      class="product-form"
      @submit.prevent="save"
    >
      <div class="form-grid">
        <el-form-item label="商品标题" prop="title" class="span-2">
          <el-input v-model="form.title" maxlength="100" placeholder="请输入商品标题" />
        </el-form-item>
        <el-form-item label="副标题" prop="subtitle">
          <el-input v-model="form.subtitle" maxlength="200" placeholder="一句简短的卖点" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item label="商品描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="介绍材质、尺寸、使用方式等商品详情"
        />
      </el-form-item>

      <div class="form-grid">
        <el-form-item label="售价（元）" prop="priceYuan">
          <el-input v-model="form.priceYuan" placeholder="0.00">
            <template #prepend>¥</template>
          </el-input>
          <p class="form-hint">将自动转换为整数分保存</p>
        </el-form-item>
        <el-form-item label="原价（元，选填）" prop="originalPriceYuan">
          <el-input v-model="form.originalPriceYuan" placeholder="用于展示划线价">
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="商品状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="在售" value="ON_SALE" />
            <el-option label="已下架" value="OFF_SALE" />
            <el-option label="草稿" value="DRAFT" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isEdit" label="初始库存" prop="stock">
          <el-input-number
            v-model="form.stock"
            :min="0"
            :max="999999"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item v-else label="库存">
          <div class="stock-readonly">
            {{ props.product?.stock ?? 0 }} 件
            <span>请使用列表中的「调整库存」操作</span>
          </div>
        </el-form-item>
      </div>

      <div class="form-grid">
        <el-form-item label="主图 URL" prop="imageUrl" class="span-2">
          <el-input v-model="form.imageUrl" placeholder="https://example.com/image.jpg" />
        </el-form-item>
        <el-form-item label="其他图片 URL（每行一个，选填）" class="span-2">
          <el-input
            v-model="form.imagesText"
            type="textarea"
            :rows="3"
            placeholder="https://example.com/image-2.jpg"
          />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">
        {{ isEdit ? '保存修改' : '创建商品' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.product-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.product-form :deep(.el-form-item__label) {
  padding-bottom: 5px;
  font-size: 11.5px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 13px;
}

.span-2 {
  grid-column: span 2;
}

.form-hint {
  margin-top: 3px;
}

.stock-readonly {
  display: flex;
  align-items: baseline;
  width: 100%;
  gap: 8px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
}

.stock-readonly span {
  color: var(--muted);
  font-size: 9.5px;
  font-weight: 400;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: auto;
  }
}
</style>
