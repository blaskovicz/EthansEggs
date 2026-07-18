<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppHeader from "../components/AppHeader.vue";
import BalanceCard from "../components/BalanceCard.vue";
import TransactionList from "../components/TransactionList.vue";
import { http } from "../api/http";
import { useAuthStore } from "../stores/auth";
import type { ChildOverview, PaymentEntry } from "../api/types";

const auth = useAuthStore();
const overview = ref<ChildOverview | null>(null);
const payments = ref<PaymentEntry[]>([]);
const marking = ref(false);
const markError = ref("");

async function load() {
  const [overviewRes, paymentsRes] = await Promise.all([
    http.get<ChildOverview>("/eggs/mine"),
    http.get<PaymentEntry[]>(`/payments/user/${auth.user!.id}`),
  ]);
  overview.value = overviewRes.data;
  payments.value = paymentsRes.data;
}

onMounted(load);

async function markCollected() {
  marking.value = true;
  markError.value = "";
  try {
    await http.post("/eggs/collect");
    await load();
  } catch (e: any) {
    markError.value = e.message;
  } finally {
    marking.value = false;
  }
}

async function undoToday() {
  marking.value = true;
  try {
    await http.delete("/eggs/collect/today");
    await load();
  } finally {
    marking.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen pb-16">
    <AppHeader />

    <main v-if="overview" class="mx-auto max-w-md space-y-5 px-4 sm:px-0">
      <div class="text-center">
        <h1 class="text-xl font-semibold text-stone-800">Hi, {{ auth.user?.name }}! 👋</h1>
      </div>

      <div class="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-stone-200">
        <p v-if="overview.markedToday" class="text-sm font-medium text-emerald-600">
          ✅ You've marked today's collection
        </p>
        <button
          v-if="overview.markedToday"
          class="mt-3 text-xs text-stone-400 underline hover:text-stone-600"
          :disabled="marking"
          @click="undoToday"
        >
          Undo
        </button>
        <button
          v-else
          class="w-full rounded-xl bg-amber-500 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
          :disabled="marking"
          @click="markCollected"
        >
          🥚 I collected eggs today!
        </button>
        <p v-if="markError" class="mt-2 text-sm text-red-600">{{ markError }}</p>
      </div>

      <BalanceCard :balance="overview.balance" />

      <div>
        <h2 class="mb-2 text-sm font-semibold text-stone-600">Activity</h2>
        <TransactionList
          :entries="overview.entries"
          :payments="payments"
          :rate-cents="overview.balance.rateCents"
        />
      </div>
    </main>
  </div>
</template>
