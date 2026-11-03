<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Delete,
  Edit,
  Location,
  Plus,
  Star,
  Ticket,
} from '@element-plus/icons-vue';
import { addressApi } from '@/api/address';
import { couponApi } from '@/api/coupons';
import { useAuthStore } from '@/stores/auth';
import type {
  Address,
  CouponTemplateView,
  UserCouponStatus,
  UserCouponView,
} from '@/types/api';
import { formatCouponValue, formatCents } from '@/utils/money';
import { formatDate, formatDateTime, USER_COUPON_STATUS_META } from '@/utils/format';
import PageHeader from '@/components/PageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import AddressFormDialog from '@/components/AddressFormDialog.vue';

type CouponFilter = 'ALL' | UserCouponStatus;

const auth = useAuthStore();
const activeTab = ref<'addresses' | 'coupons'>('addresses');

const addresses = ref<Address[]>([]);
const addressLoading = ref(true);
const addressError = ref('');
const addressDialogVisible = ref(false);
const editingAddress = ref<Address | null>(null);
const deletingId = ref<number | null>(null);
const settingDefaultId = ref<number | null>(null);

const coupons = ref<UserCouponView[]>([]);
const couponFilter = ref<CouponFilter>('ALL');
const couponLoading = ref(false);
const couponError = ref('');
const unusedCouponCount = ref(0);

const couponCenterVisible = ref(false);
const couponTemplates = ref<CouponTemplateView[]>([]);
const templateLoading = ref(false);
const templateError = ref('');
const claimingId = ref<number | null>(null);

const couponFilters: Array<{ value: CouponFilter; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'UNUSED', label: '可使用' },
  { value: 'LOCKED', label: '已锁定' },
  { value: 'USED', label: '已使用' },
  { value: 'EXPIRED', label: '已过期' },
];

const user = computed(() => auth.user);
const avatarLetter = computed(() => (user.value?.displayName || '我').slice(0, 1).toUpperCase());

async function loadAddresses(): Promise<void> {
  addressLoading.value = true;
  addressError.value = '';
  try {
    addresses.value = await addressApi.list();
  } catch (error) {
    addressError.value = error instanceof Error ? error.message : '地址加载失败';
  } finally {
    addressLoading.value = false;
  }
}

async function loadUnusedCount(): Promise<void> {
  try {
    unusedCouponCount.value = (await couponApi.mine('UNUSED')).length;
  } catch {
    // 数量只是辅助信息，失败不阻塞页面。
  }
}

async function loadCoupons(): Promise<void> {
  couponLoading.value = true;
  couponError.value = '';
  try {
    coupons.value = await couponApi.mine(
      couponFilter.value === 'ALL' ? undefined : couponFilter.value,
    );
  } catch (error) {
    couponError.value = error instanceof Error ? error.message : '优惠券加载失败';
    coupons.value = [];
  } finally {
    couponLoading.value = false;
  }
}

function openAddressDialog(address: Address | null = null): void {
  editingAddress.value = address;
  addressDialogVisible.value = true;
}

async function onAddressSaved(): Promise<void> {
  await loadAddresses();
}

async function deleteAddress(address: Address): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除 ${address.recipient} 的这条收货地址吗？`,
      '删除地址',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  deletingId.value = address.id;
  try {
    await addressApi.remove(address.id);
    ElMessage.success('地址已删除');
    await loadAddresses();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除失败');
  } finally {
    deletingId.value = null;
  }
}

async function setDefaultAddress(address: Address): Promise<void> {
  if (address.isDefault || settingDefaultId.value != null) return;
  settingDefaultId.value = address.id;
  try {
    await addressApi.setDefault(address.id);
    ElMessage.success('已设为默认地址');
    await loadAddresses();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '设置失败');
  } finally {
    settingDefaultId.value = null;
  }
}

async function loadCouponTemplates(): Promise<void> {
  templateLoading.value = true;
  templateError.value = '';
  try {
    couponTemplates.value = await couponApi.templates();
  } catch (error) {
    templateError.value = error instanceof Error ? error.message : '领券中心加载失败';
  } finally {
    templateLoading.value = false;
  }
}

function openCouponCenter(): void {
  couponCenterVisible.value = true;
  void loadCouponTemplates();
}

function templateAvailability(template: CouponTemplateView): {
  text: string;
  disabled: boolean;
} {
  if (template.status !== 'ACTIVE') return { text: '已停用', disabled: true };
  if (template.remainingQuantity <= 0) return { text: '已抢光', disabled: true };
  if (template.claimedByMe >= template.perUserLimit) return { text: '已领取', disabled: true };
  return { text: '立即领取', disabled: false };
}

async function claimCoupon(template: CouponTemplateView): Promise<void> {
  const state = templateAvailability(template);
  if (state.disabled || claimingId.value != null) return;
  claimingId.value = template.id;
  try {
    await couponApi.claim(template.id);
    ElMessage.success('优惠券领取成功');
    await Promise.all([loadCouponTemplates(), loadCoupons(), loadUnusedCount()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '领取失败');
  } finally {
    claimingId.value = null;
  }
}

watch(activeTab, (tab) => {
  if (tab === 'coupons' && !coupons.value.length && !couponLoading.value) {
    void loadCoupons();
  }
});

watch(couponFilter, () => {
  if (activeTab.value === 'coupons') void loadCoupons();
});

onMounted(async () => {
  await Promise.allSettled([loadAddresses(), loadCoupons(), loadUnusedCount()]);
});
</script>

<template>
  <div class="container page-shell fade-page">
    <PageHeader
      title="个人中心"
      description="管理收货地址与优惠券，让每一次下单更从容。"
      kicker="MY ACCOUNT"
    />

    <section class="profile-card">
      <div class="profile-main">
        <span class="profile-avatar">{{ avatarLetter }}</span>
        <div class="profile-identity">
          <div class="name-row">
            <h2>{{ user?.displayName || user?.username }}</h2>
            <span class="role-tag">{{ user?.role === 'ADMIN' ? '管理员' : '会员' }}</span>
          </div>
          <p>@{{ user?.username }} · {{ user?.email }}</p>
        </div>
      </div>
      <div class="profile-stats">
        <div>
          <strong>{{ addresses.length }}</strong>
          <span>收货地址</span>
        </div>
        <div>
          <strong>{{ unusedCouponCount }}</strong>
          <span>可用优惠券</span>
        </div>
        <el-button
          v-if="auth.isAdmin"
          plain
          class="admin-entry"
          @click="$router.push('/admin')"
        >
          进入管理后台
        </el-button>
      </div>
    </section>

    <section class="profile-content surface-card">
      <el-tabs v-model="activeTab" class="profile-tabs">
        <el-tab-pane name="addresses">
          <template #label>
            <span class="tab-label">
              <el-icon><Location /></el-icon>
              地址簿
              <em v-if="addresses.length">{{ addresses.length }}</em>
            </span>
          </template>

          <div class="tab-toolbar">
            <div>
              <h3>收货地址</h3>
              <p>最多添加多条地址，可设置一条默认地址。</p>
            </div>
            <el-button type="primary" plain :icon="Plus" @click="openAddressDialog()">
              新增地址
            </el-button>
          </div>

          <div v-if="addressError" class="error-band">
            <span>{{ addressError }}</span>
            <el-button size="small" plain @click="loadAddresses">重试</el-button>
          </div>

          <div v-if="addressLoading" class="address-skeletons">
            <div v-for="item in 3" :key="item" class="address-skeleton">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line tiny"></div>
            </div>
          </div>

          <div v-else-if="addresses.length" class="address-list">
            <article
              v-for="address in addresses"
              :key="address.id"
              :class="['profile-address', { default: address.isDefault }]"
            >
              <div class="address-head">
                <div class="recipient-line">
                  <strong>{{ address.recipient }}</strong>
                  <span>{{ address.phone }}</span>
                  <el-tag v-if="address.isDefault" size="small" type="warning" effect="plain">
                    默认地址
                  </el-tag>
                </div>
                <span class="address-index">ADDRESS {{ String(address.id).padStart(2, '0') }}</span>
              </div>
              <p>
                {{ address.province }} {{ address.city }} {{ address.district }}
                {{ address.detail }}
              </p>
              <div class="address-actions">
                <button
                  v-if="!address.isDefault"
                  type="button"
                  class="address-action"
                  :disabled="settingDefaultId === address.id"
                  @click="setDefaultAddress(address)"
                >
                  <el-icon><Star /></el-icon>
                  {{ settingDefaultId === address.id ? '设置中…' : '设为默认' }}
                </button>
                <button type="button" class="address-action" @click="openAddressDialog(address)">
                  <el-icon><Edit /></el-icon>编辑
                </button>
                <button
                  type="button"
                  class="address-action danger"
                  :disabled="deletingId === address.id"
                  @click="deleteAddress(address)"
                >
                  <el-icon><Delete /></el-icon>删除
                </button>
              </div>
            </article>
          </div>

          <EmptyState
            v-else
            compact
            title="还没有收货地址"
            description="添加地址后，结算时会更加方便。"
          >
            <template #icon>
              <el-icon :size="26"><Location /></el-icon>
            </template>
            <template #action>
              <el-button type="primary" round :icon="Plus" @click="openAddressDialog()">
                添加第一个地址
              </el-button>
            </template>
          </EmptyState>
        </el-tab-pane>

        <el-tab-pane name="coupons">
          <template #label>
            <span class="tab-label">
              <el-icon><Ticket /></el-icon>
              我的优惠券
              <em v-if="unusedCouponCount">{{ unusedCouponCount }}</em>
            </span>
          </template>

          <div class="tab-toolbar coupon-toolbar">
            <div>
              <h3>我的优惠券</h3>
              <p>优惠券使用规则以结算页报价为准。</p>
            </div>
            <el-button type="primary" plain :icon="Ticket" @click="openCouponCenter">
              领券中心
            </el-button>
          </div>

          <div class="chip-row coupon-filter">
            <button
              v-for="filter in couponFilters"
              :key="filter.value"
              type="button"
              :class="['filter-chip', { active: couponFilter === filter.value }]"
              @click="couponFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>

          <div v-if="couponError" class="error-band">
            <span>{{ couponError }}</span>
            <el-button size="small" plain @click="loadCoupons">重试</el-button>
          </div>

          <div v-if="couponLoading" class="coupon-skeletons">
            <div v-for="item in 3" :key="item" class="coupon-skeleton">
              <div class="skeleton-value"></div>
              <div class="skeleton-lines">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
          </div>

          <div v-else-if="coupons.length" class="my-coupon-grid">
            <article
              v-for="coupon in coupons"
              :key="coupon.id"
              :class="['my-coupon', { inactive: coupon.status !== 'UNUSED' }]"
            >
              <div class="my-coupon-value">
                <strong>{{ formatCouponValue(coupon.type, coupon.value) }}</strong>
                <small>满 {{ formatCents(coupon.minSpendCents) }} 可用</small>
              </div>
              <div class="my-coupon-body">
                <div class="coupon-name-row">
                  <strong>{{ coupon.name }}</strong>
                  <el-tag
                    size="small"
                    :type="USER_COUPON_STATUS_META[coupon.status].type"
                    effect="plain"
                  >
                    {{ USER_COUPON_STATUS_META[coupon.status].label }}
                  </el-tag>
                </div>
                <span class="coupon-validity">
                  {{ formatDate(coupon.validFrom) }} 至 {{ formatDate(coupon.validTo) }}
                </span>
                <RouterLink
                  v-if="coupon.orderId"
                  :to="`/orders/${coupon.orderId}`"
                  class="coupon-order-link"
                >
                  查看关联订单
                </RouterLink>
              </div>
            </article>
          </div>

          <EmptyState
            v-else
            compact
            title="暂无该状态的优惠券"
            description="去领券中心看看，或许有适合你的优惠。"
          >
            <template #icon>
              <el-icon :size="26"><Ticket /></el-icon>
            </template>
            <template #action>
              <el-button round :icon="Ticket" @click="openCouponCenter">去领券</el-button>
            </template>
          </EmptyState>
        </el-tab-pane>
      </el-tabs>
    </section>

    <AddressFormDialog
      v-model="addressDialogVisible"
      :address="editingAddress"
      @saved="onAddressSaved"
    />

    <el-dialog
      v-model="couponCenterVisible"
      title="领券中心"
      width="650px"
      append-to-body
      class="coupon-center-dialog"
    >
      <div v-loading="templateLoading" class="coupon-center">
        <div v-if="templateError" class="error-band">
          <span>{{ templateError }}</span>
          <el-button size="small" plain @click="loadCouponTemplates">重试</el-button>
        </div>

        <div v-if="couponTemplates.length" class="template-list">
          <article
            v-for="template in couponTemplates"
            :key="template.id"
            :class="['template-card', { disabled: templateAvailability(template).disabled }]"
          >
            <div class="template-value">
              <strong>{{ formatCouponValue(template.type, template.value) }}</strong>
              <small>满 {{ formatCents(template.minSpendCents) }} 可用</small>
            </div>
            <div class="template-info">
              <strong>{{ template.name }}</strong>
              <span>有效期至 {{ formatDateTime(template.validTo) }}</span>
              <small>
                剩余 {{ template.remainingQuantity }}/{{ template.totalQuantity }} · 每人限领
                {{ template.perUserLimit }} 张
              </small>
            </div>
            <el-button
              size="small"
              :type="templateAvailability(template).disabled ? 'default' : 'primary'"
              :disabled="templateAvailability(template).disabled"
              :loading="claimingId === template.id"
              @click="claimCoupon(template)"
            >
              {{ templateAvailability(template).text }}
            </el-button>
          </article>
        </div>

        <EmptyState
          v-else-if="!templateLoading && !templateError"
          compact
          title="暂无可领取的优惠券"
          description="新的优惠正在准备中，请稍后再来。"
        />
      </div>
      <template #footer>
        <el-button @click="couponCenterVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.profile-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 26px 30px;
  margin-bottom: 20px;
  color: #fff;
  background:
    radial-gradient(circle at 82% 20%, rgba(232, 93, 42, 0.26), transparent 32%),
    linear-gradient(130deg, var(--navy), #202e45);
  border-radius: var(--radius-lg);
}

.profile-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  display: grid;
  flex: 0 0 auto;
  width: 62px;
  height: 62px;
  color: #ffe9d8;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  font-family: var(--font-display);
  font-size: 25px;
  place-items: center;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.name-row h2 {
  font-family: var(--font-display);
  font-size: 25px;
  font-weight: 500;
}

.role-tag {
  padding: 2px 8px;
  color: #f3c7ab;
  background: rgba(232, 93, 42, 0.16);
  border: 1px solid rgba(232, 93, 42, 0.24);
  border-radius: 4px;
  font-size: 9px;
}

.profile-identity p {
  margin-top: 5px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.48);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-stats {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 24px;
}

.profile-stats > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 24px;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
}

.profile-stats strong {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
}

.profile-stats span {
  color: rgba(255, 255, 255, 0.45);
  font-size: 9.5px;
}

.admin-entry {
  margin-left: 3px;
  color: rgba(255, 255, 255, 0.75);
  background: transparent;
  border-color: rgba(255, 255, 255, 0.22);
}

.admin-entry:hover {
  color: var(--ink);
  background: #fff;
  border-color: #fff;
}

.profile-content {
  padding: 8px 26px 28px;
}

.profile-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.profile-tabs :deep(.el-tabs__item) {
  height: 56px;
  font-size: 13px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-label em {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border-radius: 999px;
  font-size: 9px;
  font-style: normal;
  place-items: center;
}

.tab-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 18px;
  margin-bottom: 19px;
  border-bottom: 1px solid var(--line);
}

.tab-toolbar h3 {
  font-size: 17px;
  font-weight: 700;
}

.tab-toolbar p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10.5px;
}

.address-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.profile-address {
  display: flex;
  flex-direction: column;
  padding: 17px 18px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 11px;
  transition: all 0.18s ease;
}

.profile-address.default {
  background:
    linear-gradient(135deg, rgba(232, 93, 42, 0.035), transparent 60%),
    #fffdfb;
  border-color: #edc8b7;
}

.address-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.recipient-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.recipient-line strong {
  font-size: 13px;
  font-weight: 600;
}

.recipient-line > span {
  color: var(--muted);
  font-size: 10.5px;
}

.address-index {
  flex-shrink: 0;
  color: #c8bdb0;
  font-size: 8px;
  letter-spacing: 0.1em;
}

.profile-address > p {
  flex: 1;
  margin-top: 10px;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.7;
  word-break: break-word;
}

.address-actions {
  display: flex;
  gap: 15px;
  padding-top: 12px;
  margin-top: 14px;
  border-top: 1px dashed var(--line);
}

.address-action {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  color: var(--muted);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 10.5px;
}

.address-action:hover {
  color: var(--brand);
}

.address-action.danger:hover {
  color: var(--danger);
}

.address-action:disabled {
  cursor: wait;
  opacity: 0.55;
}

.address-skeletons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.address-skeleton {
  height: 138px;
  padding: 18px;
  background: #faf8f4;
  border-radius: 11px;
}

.address-skeleton .skeleton-line {
  margin-bottom: 12px;
}

.coupon-filter {
  margin-bottom: 18px;
}

.my-coupon-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.my-coupon {
  display: flex;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 11px;
}

.my-coupon.inactive {
  filter: grayscale(0.55);
  opacity: 0.65;
}

.my-coupon-value {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 126px;
  flex-direction: column;
  gap: 4px;
  padding: 19px 10px;
  color: var(--brand-strong);
  background:
    radial-gradient(circle at 20% 10%, rgba(232, 93, 42, 0.14), transparent 48%),
    var(--brand-soft);
  border-right: 1px dashed #e8c8b6;
}

.my-coupon-value strong {
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 600;
}

.my-coupon-value small {
  color: #a87a63;
  font-size: 9px;
}

.my-coupon-body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  padding: 14px 16px;
}

.coupon-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.coupon-name-row strong {
  overflow: hidden;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coupon-validity {
  color: var(--muted);
  font-size: 9.5px;
}

.coupon-order-link {
  align-self: flex-start;
  margin-top: auto;
  color: var(--brand);
  font-size: 10px;
}

.coupon-order-link:hover {
  text-decoration: underline;
}

.coupon-skeletons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.coupon-skeleton {
  display: flex;
  height: 102px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 11px;
}

.skeleton-value {
  flex: 0 0 126px;
  background: #f3efe9;
}

.coupon-skeleton .skeleton-lines {
  flex: 1;
  padding: 20px 16px;
}

.coupon-center {
  min-height: 180px;
}

.template-list {
  display: grid;
  gap: 10px;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 17px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 11px;
}

.template-card.disabled {
  background: #fbfaf8;
}

.template-value {
  display: flex;
  align-items: center;
  flex: 0 0 102px;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  color: var(--brand-strong);
  background: var(--brand-soft);
  border-radius: 8px;
}

.template-value strong {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 600;
}

.template-value small {
  color: #a87a63;
  font-size: 8px;
}

.template-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.template-info strong {
  overflow: hidden;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-info span {
  color: var(--ink-soft);
  font-size: 10px;
}

.template-info small {
  color: var(--muted);
  font-size: 9px;
}

@media (max-width: 900px) {
  .profile-card {
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
  }

  .profile-stats {
    width: 100%;
  }

  .profile-stats > div {
    padding-left: 0;
    border-left: 0;
  }

  .profile-stats > div + div {
    padding-left: 20px;
    border-left: 1px solid rgba(255, 255, 255, 0.12);
  }

  .admin-entry {
    margin-left: auto;
  }
}

@media (max-width: 768px) {
  .profile-card {
    padding: 20px;
    margin-bottom: 14px;
  }

  .profile-content {
    padding: 4px 15px 18px;
  }

  .profile-avatar {
    width: 52px;
    height: 52px;
    font-size: 21px;
  }

  .name-row h2 {
    font-size: 21px;
  }

  .address-list,
  .address-skeletons,
  .my-coupon-grid,
  .coupon-skeletons {
    grid-template-columns: 1fr;
  }

  .tab-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .tab-toolbar .el-button {
    width: 100%;
  }

  .profile-tabs :deep(.el-tabs__item) {
    padding: 0 12px;
    font-size: 12px;
  }

  .my-coupon-value {
    flex-basis: 105px;
  }

  .my-coupon-value strong {
    font-size: 20px;
  }

  .template-card {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
  }

  .template-value {
    flex: 0 0 85px;
  }

  .template-info {
    flex-basis: calc(100% - 100px);
  }

  .template-card .el-button {
    width: 100%;
  }
}

@media (max-width: 420px) {
  .profile-identity p {
    max-width: 205px;
  }

  .profile-stats {
    gap: 12px;
  }

  .profile-stats > div + div {
    padding-left: 14px;
  }

  .profile-stats strong {
    font-size: 20px;
  }

  .admin-entry {
    padding: 6px 10px;
    font-size: 11px;
  }

  .address-index {
    display: none;
  }

  .coupon-filter {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 2px;
  }
}
</style>
