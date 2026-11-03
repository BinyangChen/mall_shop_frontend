<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import { adminApi } from '@/api/admin';
import type { Category } from '@/types/api';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import CategoryFormDialog from '@/components/admin/CategoryFormDialog.vue';

const categories = ref<Category[]>([]);
const loading = ref(true);
const error = ref('');
const dialogVisible = ref(false);
const editingCategory = ref<Category | null>(null);
const deletingId = ref<number | null>(null);

async function loadCategories(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    categories.value = await adminApi.categories.list();
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : '分类加载失败';
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  editingCategory.value = null;
  dialogVisible.value = true;
}

function openEdit(category: Category): void {
  editingCategory.value = category;
  dialogVisible.value = true;
}

async function deleteCategory(category: Category): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除分类「${category.name}」吗？分类下仍有商品时无法删除。`,
      '删除分类',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  deletingId.value = category.id;
  try {
    await adminApi.categories.remove(category.id);
    ElMessage.success('分类已删除');
    await loadCategories();
  } catch (deleteError) {
    ElMessage.error(deleteError instanceof Error ? deleteError.message : '删除失败');
  } finally {
    deletingId.value = null;
  }
}

onMounted(loadCategories);
</script>

<template>
  <div class="fade-page">
    <PageHeader
      title="分类管理"
      description="维护商品分类与展示顺序；停用分类不会出现在前台筛选入口。"
      kicker="CATEGORY SETTINGS"
    >
      <template #actions>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增分类</el-button>
      </template>
    </PageHeader>

    <div v-if="error" class="error-band">
      <span>{{ error }}</span>
      <el-button size="small" plain @click="loadCategories">重新加载</el-button>
    </div>

    <section class="admin-panel">
      <div class="category-head">
        <div>
          <span class="category-count">共 {{ categories.length }} 个分类</span>
          <p>排序值越小越靠前；分类下仍有商品时不可删除。</p>
        </div>
        <span class="category-tip">ADMIN ONLY</span>
      </div>

      <el-table v-loading="loading" :data="categories" size="small" class="category-table">
        <el-table-column label="排序" prop="sortOrder" width="80" align="center">
          <template #default="{ row }">
            <span class="sort-order">{{ String(row.sortOrder).padStart(2, '0') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="分类名称" min-width="180">
          <template #default="{ row }">
            <div class="category-name">
              <span class="category-mark">{{ row.name.slice(0, 1) }}</span>
              <strong>{{ row.name }}</strong>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类 ID" prop="id" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="(row.status ?? 'ACTIVE') === 'ACTIVE' ? 'success' : 'info'"
              size="small"
              effect="plain"
            >
              {{ (row.status ?? 'ACTIVE') === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button link type="primary" size="small" :icon="Edit" @click="openEdit(row)">
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                :icon="Delete"
                :loading="deletingId === row.id"
                @click="deleteCategory(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState
            compact
            title="还没有分类"
            description="创建分类后，商品就可以归类展示。"
          >
            <template #action>
              <el-button type="primary" plain :icon="Plus" @click="openCreate">新增分类</el-button>
            </template>
          </EmptyState>
        </template>
      </el-table>
    </section>

    <CategoryFormDialog
      v-model="dialogVisible"
      :category="editingCategory"
      @saved="loadCategories"
    />
  </div>
</template>

<style scoped>
.admin-panel {
  padding: 18px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.category-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.category-count {
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
}

.category-head p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 9.5px;
}

.category-tip {
  color: #c1b8ad;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.13em;
}

.sort-order {
  color: var(--muted);
  font-family: var(--font-display);
  font-size: 12px;
}

.category-name {
  display: flex;
  align-items: center;
  gap: 9px;
}

.category-mark {
  display: grid;
  width: 29px;
  height: 29px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border-radius: 7px;
  font-size: 11px;
  font-weight: 600;
  place-items: center;
}

.category-name strong {
  font-size: 11.5px;
  font-weight: 500;
}

.row-actions {
  display: flex;
  align-items: center;
}

.row-actions :deep(.el-button) {
  margin-left: 0;
  padding: 3px 6px;
  font-size: 10.5px;
}

@media (max-width: 600px) {
  .admin-panel {
    padding: 13px;
    border-radius: 10px;
  }

  .category-tip {
    display: none;
  }
}
</style>
