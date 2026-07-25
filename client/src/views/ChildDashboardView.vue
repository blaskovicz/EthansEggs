<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AppHeader from "../components/AppHeader.vue";
import BalanceCard from "../components/BalanceCard.vue";
import TransactionList from "../components/TransactionList.vue";
import TodayStatusCard from "../components/TodayStatusCard.vue";
import CollectEggsDialog from "../components/CollectEggsDialog.vue";
import PrizeShop from "../components/PrizeShop.vue";
import { http } from "../api/http";
import { useAuthStore } from "../stores/auth";
import { useForegroundRefresh } from "../lib/useForegroundRefresh";
import type { AppSettings, ChildOverview, PaymentEntry, Prize, PrizeAward, Profile, TodayEntry } from "../api/types";

const auth = useAuthStore();
const overview = ref<ChildOverview | null>(null);
const payments = ref<PaymentEntry[]>([]);
const prizes = ref<Prize[]>([]);
const prizeAwards = ref<PrizeAward[]>([]);
const profiles = ref<Profile[]>([]);
const todayEntries = ref<TodayEntry[]>([]);
const marking = ref(false);
const markError = ref("");
const showDialog = ref(false);
const todayStatus = ref<InstanceType<typeof TodayStatusCard> | null>(null);
const chickenCount = ref<number>(30);

async function load() {
  const [overviewRes, paymentsRes, profilesRes, todayRes, settingsRes, prizesRes, prizeAwardsRes] = await Promise.all([
    http.get<ChildOverview>("/eggs/mine"),
    http.get<PaymentEntry[]>(`/payments/user/${auth.user!.id}`),
    http.get<Profile[]>("/auth/profiles"),
    http.get<TodayEntry[]>("/eggs/today"),
    http.get<AppSettings>("/settings"),
    http.get<Prize[]>("/prizes"),
    http.get<PrizeAward[]>(`/prizes/awards/user/${auth.user!.id}`),
  ]);
  overview.value = overviewRes.data;
  payments.value = paymentsRes.data;
  profiles.value = profilesRes.data;
  todayEntries.value = todayRes.data;
  chickenCount.value = settingsRes.data.chickenCount;
  prizes.value = prizesRes.data;
  prizeAwards.value = prizeAwardsRes.data;
}

onMounted(load);

useForegroundRefresh(async () => {
  await load();
  await todayStatus.value?.reload();
});

// Once anyone (a sibling or a parent) has logged today, the day is locked for everyone
// else - only one person starts today's collection, naming helpers along the way.
const blockedByOther = computed(() => todayEntries.value.length > 0 && !overview.value?.markedToday);

const blockedMessage = computed(() => {
  const first = todayEntries.value[0];
  if (!first) return "";
  return first.user.role === "PARENT"
    ? `🏡 ${first.user.name} already logged today's collection.`
    : `🥚 ${first.user.name} already marked today's collection.`;
});

const availableSiblings = computed<Profile[]>(() => {
  const markedIds = new Set(todayEntries.value.map((e) => e.userId));
  return profiles.value.filter(
    (p) => p.role === "CHILD" && p.id !== auth.user?.id && !markedIds.has(p.id)
  );
});

async function submitCollection(payload: { eggCount?: number; helperIds?: string[] }) {
  showDialog.value = false;
  marking.value = true;
  markError.value = "";
  try {
    await http.post("/eggs/collect", payload);
    await load();
    await todayStatus.value?.reload();
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
    await todayStatus.value?.reload();
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
          Actually, I really didn't...
        </button>
        <template v-else-if="blockedByOther">
          <p class="text-sm text-stone-500">{{ blockedMessage }}</p>
        </template>
        <button
          v-else
          class="w-full rounded-xl bg-amber-500 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
          :disabled="marking"
          @click="showDialog = true"
        >
          🥚 I collected eggs today!
        </button>
        <p v-if="markError" class="mt-2 text-sm text-red-600">{{ markError }}</p>
      </div>

      <TodayStatusCard ref="todayStatus" />

      <BalanceCard :balance="overview.balance" />

      <PrizeShop :prizes="prizes" :balance-cents="overview.balance.balanceCents" />

      <div>
        <h2 class="mb-2 text-sm font-semibold text-stone-600">Activity</h2>
        <TransactionList
          :entries="overview.entries"
          :payments="payments"
          :prize-awards="prizeAwards"
        />
      </div>
    </main>

    <CollectEggsDialog
      v-if="showDialog"
      :siblings="availableSiblings"
      :max-eggs="chickenCount"
      @submit="submitCollection"
      @cancel="showDialog = false"
    />
  </div>
</template>
