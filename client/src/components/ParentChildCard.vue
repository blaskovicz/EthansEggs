<script setup lang="ts">
import { ref } from "vue";
import { http } from "../api/http";
import { formatCents } from "../lib/format";
import TransactionList from "./TransactionList.vue";
import type { ChildBalance, ChildOverview, PaymentEntry } from "../api/types";

const props = defineProps<{ balance: ChildBalance }>();
const emit = defineEmits<{ changed: [] }>();

const expanded = ref(false);
const overview = ref<ChildOverview | null>(null);
const payments = ref<PaymentEntry[]>([]);
const loading = ref(false);

const amount = ref("");
const note = ref("");
const submitting = ref(false);
const formError = ref("");

async function loadDetail() {
  loading.value = true;
  try {
    const [overviewRes, paymentsRes] = await Promise.all([
      http.get<ChildOverview>(`/eggs/user/${props.balance.userId}`),
      http.get<PaymentEntry[]>(`/payments/user/${props.balance.userId}`),
    ]);
    overview.value = overviewRes.data;
    payments.value = paymentsRes.data;
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

      <div v-if="loading" class="py-6 text-center text-sm text-stone-400">Loading…</div>
      <TransactionList
        v-else-if="overview"
        :entries="overview.entries"
        :payments="payments"
        :rate-cents="balance.rateCents"
      />
    </div>
  </div>
</template>
