<script setup lang="ts">
import { ref } from "vue";
import { http } from "../api/http";
import { formatCents } from "../lib/format";
import { todayLocalDate } from "../lib/today";
import TransactionList from "./TransactionList.vue";
import type { ChildBalance, ChildOverview, PaymentEntry, Prize, PrizeAward } from "../api/types";

const props = defineProps<{ balance: ChildBalance; prizes: Prize[] }>();
const emit = defineEmits<{ changed: [] }>();

const expanded = ref(false);
const overview = ref<ChildOverview | null>(null);
const payments = ref<PaymentEntry[]>([]);
const prizeAwards = ref<PrizeAward[]>([]);
const loading = ref(false);

const amount = ref("");
const note = ref("");
const submitting = ref(false);
const formError = ref("");

const showBackdateForm = ref(false);
const backdateDate = ref(todayLocalDate());
// Vue auto-casts v-model on <input type="number"> to a number (or leaves the
// raw string when it can't parse, e.g. an emptied field) regardless of the
// .number modifier - so this has to accept either.
const backdateEggCount = ref<number | string>("");
const backdateSubmitting = ref(false);
const backdateError = ref("");

const awardError = ref("");
const awardingPrizeId = ref<string | null>(null);

async function loadDetail() {
  loading.value = true;
  try {
    const [overviewRes, paymentsRes, awardsRes] = await Promise.all([
      http.get<ChildOverview>(`/eggs/user/${props.balance.userId}`),
      http.get<PaymentEntry[]>(`/payments/user/${props.balance.userId}`),
      http.get<PrizeAward[]>(`/prizes/awards/user/${props.balance.userId}`),
    ]);
    overview.value = overviewRes.data;
    payments.value = paymentsRes.data;
    prizeAwards.value = awardsRes.data;
  } finally {
    loading.value = false;
  }
}

async function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value && !overview.value) {
    await loadDetail();
  }
}

async function recordPayment() {
  formError.value = "";
  const value = Number(amount.value);
  if (!value || value <= 0) {
    formError.value = "Enter a valid amount";
    return;
  }
  submitting.value = true;
  try {
    await http.post("/payments", { childId: props.balance.userId, amount: value, note: note.value || undefined });
    amount.value = "";
    note.value = "";
    await loadDetail();
    emit("changed");
  } catch (e: any) {
    formError.value = e.message;
  } finally {
    submitting.value = false;
  }
}

async function submitBackdate() {
  backdateError.value = "";
  const raw = backdateEggCount.value;
  const eggCount = raw === "" ? undefined : Number(raw);
  if (!backdateDate.value) {
    backdateError.value = "Pick a date";
    return;
  }
  backdateSubmitting.value = true;
  try {
    await http.post("/eggs/manual", { userId: props.balance.userId, date: backdateDate.value, eggCount });
    backdateEggCount.value = "";
    showBackdateForm.value = false;
    await loadDetail();
    emit("changed");
  } catch (e: any) {
    backdateError.value = e.message;
  } finally {
    backdateSubmitting.value = false;
  }
}

async function editCollection(id: string, eggCount: number | null) {
  await http.patch(`/eggs/${id}`, { eggCount });
  await loadDetail();
  emit("changed");
}

async function cancelCollection(id: string) {
  await http.delete(`/eggs/${id}`);
  await loadDetail();
  emit("changed");
}

async function cancelPayment(id: string) {
  await http.delete(`/payments/${id}`);
  await loadDetail();
  emit("changed");
}

async function cancelPrize(id: string) {
  await http.delete(`/prizes/awards/${id}`);
  await loadDetail();
  emit("changed");
}

async function awardPrize(prizeId: string) {
  awardError.value = "";
  awardingPrizeId.value = prizeId;
  try {
    await http.post(`/prizes/${prizeId}/award`, { childId: props.balance.userId });
    await loadDetail();
    emit("changed");
  } catch (e: any) {
    awardError.value = e.message;
  } finally {
    awardingPrizeId.value = null;
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
    <button class="flex w-full items-center justify-between px-5 py-4" @click="toggle">
      <div class="flex items-center gap-3">
        <span
          class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
          :style="{ backgroundColor: balance.color }"
        >
          {{ balance.name[0] }}
        </span>
        <div class="text-left">
          <p class="font-medium text-stone-800">{{ balance.name }}</p>
          <p class="text-xs text-stone-400">{{ balance.collectionsCount }} collections</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span
          class="text-lg font-semibold"
          :class="balance.balanceCents > 0 ? 'text-emerald-600' : 'text-stone-400'"
        >
          {{ formatCents(balance.balanceCents) }}
        </span>
        <span class="text-stone-400 transition" :class="expanded ? 'rotate-180' : ''">⌄</span>
      </div>
    </button>

    <div v-if="expanded" class="border-t border-stone-100 px-5 py-4">
      <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="recordPayment">
        <div class="flex-1 min-w-[100px]">
          <label class="mb-1 block text-xs text-stone-500">Amount</label>
          <input
            v-model="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="5.00"
            class="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div class="flex-[2] min-w-[140px]">
          <label class="mb-1 block text-xs text-stone-500">Note (optional)</label>
          <input
            v-model="note"
            type="text"
            placeholder="Cash, allowance, etc."
            class="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          :disabled="submitting"
          class="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          Record payment
        </button>
      </form>
      <p v-if="formError" class="mb-3 text-sm text-red-600">{{ formError }}</p>

      <div class="mb-4">
        <button
          v-if="!showBackdateForm"
          type="button"
          class="text-xs font-medium text-amber-600 hover:underline"
          @click="showBackdateForm = true"
        >
          + Log a missed day
        </button>
        <form v-else class="flex flex-wrap items-end gap-2 rounded-xl bg-amber-50 p-3" @submit.prevent="submitBackdate">
          <div>
            <label class="mb-1 block text-xs text-stone-500">Date</label>
            <input
              v-model="backdateDate"
              type="date"
              :max="todayLocalDate()"
              class="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-stone-500">Eggs (optional)</label>
            <input
              v-model="backdateEggCount"
              type="number"
              min="0"
              placeholder="?"
              class="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            :disabled="backdateSubmitting"
            class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            @click="showBackdateForm = false"
          >
            Cancel
          </button>
        </form>
        <p v-if="backdateError" class="mt-2 text-sm text-red-600">{{ backdateError }}</p>
      </div>

      <div v-if="prizes.length > 0" class="mb-4">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Award a prize</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="p in prizes"
            :key="p.id"
            type="button"
            :disabled="awardingPrizeId === p.id"
            class="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-50"
            @click="awardPrize(p.id)"
          >
            <span>{{ p.icon }}</span>
            <span class="font-medium text-stone-700">{{ p.name }}</span>
            <span class="text-stone-400">{{ formatCents(p.priceCents) }}</span>
          </button>
        </div>
        <p v-if="awardError" class="mt-2 text-sm text-red-600">{{ awardError }}</p>
      </div>

      <div v-if="loading" class="py-6 text-center text-sm text-stone-400">Loading…</div>
      <TransactionList
        v-else-if="overview"
        :entries="overview.entries"
        :payments="payments"
        :prize-awards="prizeAwards"
        manageable
        @edit-collection="editCollection"
        @cancel-collection="cancelCollection"
        @cancel-payment="cancelPayment"
        @cancel-prize="cancelPrize"
      />
    </div>
  </div>
</template>
