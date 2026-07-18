<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AppHeader from "../components/AppHeader.vue";
import ParentChildCard from "../components/ParentChildCard.vue";
import ParentHistoryCard from "../components/ParentHistoryCard.vue";
import TodayStatusCard from "../components/TodayStatusCard.vue";
import CollectEggsDialog from "../components/CollectEggsDialog.vue";
import { http } from "../api/http";
import { useAuthStore } from "../stores/auth";
import type { ChildBalance, Profile, TodayEntry } from "../api/types";

const auth = useAuthStore();
const children = ref<ChildBalance[]>([]);
const parents = ref<Profile[]>([]);
const rate = ref<number>(1);
const rateInput = ref<string>("1.00");
const savingRate = ref(false);
const rateSaved = ref(false);
const editingRate = ref(false);
const todayEntries = ref<TodayEntry[]>([]);
const showDialog = ref(false);
const marking = ref(false);
const markError = ref("");
const todayStatus = ref<InstanceType<typeof TodayStatusCard> | null>(null);
const historyRefreshKey = ref(0);

async function loadChildren() {
  const { data } = await http.get<ChildBalance[]>("/users/children");
  children.value = data;
}

async function loadParents() {
  const { data } = await http.get<Profile[]>("/auth/profiles");
  parents.value = data.filter((p) => p.role === "PARENT");
}

async function loadRate() {
  const { data } = await http.get<{ rate: number }>("/settings");
  rate.value = data.rate;
  rateInput.value = data.rate.toFixed(2);
}

async function loadToday() {
  const { data } = await http.get<TodayEntry[]>("/eggs/today");
  todayEntries.value = data;
}

onMounted(() => {
  loadChildren();
  loadParents();
  loadRate();
  loadToday();
});

const markedByMeToday = computed(() => todayEntries.value.some((e) => e.userId === auth.user?.id));
const blockedByOther = computed(() => todayEntries.value.length > 0 && !markedByMeToday.value);
const blockedMessage = computed(() => {
  const first = todayEntries.value[0];
  return first ? `${first.user.role === "PARENT" ? "🏡" : "🥚"} ${first.user.name} already logged today's collection.` : "";
});

async function saveRate() {
  const value = Number(rateInput.value);
  if (!value || value <= 0) return;
  savingRate.value = true;
  rateSaved.value = false;
  try {
    const { data } = await http.put<{ rate: number }>("/settings", { rate: value });
    rate.value = data.rate;
    editingRate.value = false;
    rateSaved.value = true;
    await loadChildren();
    setTimeout(() => (rateSaved.value = false), 2000);
  } finally {
    savingRate.value = false;
  }
}

async function submitCollection(payload: { eggCount?: number }) {
  showDialog.value = false;
  marking.value = true;
  markError.value = "";
  try {
    await http.post("/eggs/collect", payload);
    await loadToday();
    await todayStatus.value?.reload();
    historyRefreshKey.value++;
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
    await loadToday();
    await todayStatus.value?.reload();
    historyRefreshKey.value++;
  } finally {
    marking.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen pb-16">
    <AppHeader />

    <main class="mx-auto max-w-lg space-y-5 px-4 sm:px-0">
      <div class="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-stone-200">
        <p v-if="markedByMeToday" class="text-sm font-medium text-emerald-600">
          ✅ You logged today's collection
        </p>
        <button
          v-if="markedByMeToday"
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
          🥚 Mark eggs collected today
        </button>
        <p v-if="markError" class="mt-2 text-sm text-red-600">{{ markError }}</p>
      </div>

      <TodayStatusCard ref="todayStatus" />

      <div class="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-stone-200">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-stone-400">Rate per collection</p>
          <p v-if="!editingRate" class="mt-1 text-xl font-semibold text-stone-800">
            ${{ rate.toFixed(2) }}
          </p>
          <div v-else class="mt-1 flex items-center gap-2">
            <span class="text-stone-500">$</span>
            <input
              v-model="rateInput"
              type="number"
              step="0.01"
              min="0"
              class="w-20 rounded-lg border border-stone-300 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
        <div class="flex gap-2">
          <template v-if="editingRate">
            <button
              class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              :disabled="savingRate"
              @click="saveRate"
            >
              Save
            </button>
            <button
              class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
              @click="editingRate = false"
            >
              Cancel
            </button>
          </template>
          <button
            v-else
            class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            @click="editingRate = true"
          >
            Edit
          </button>
        </div>
      </div>
      <p v-if="rateSaved" class="-mt-3 text-center text-xs text-emerald-600">Rate updated</p>

      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-stone-600">Kids</h2>
        <ParentChildCard
          v-for="c in children"
          :key="c.userId"
          :balance="c"
          @changed="loadChildren"
        />
      </div>

      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-stone-600">Parents</h2>
        <ParentHistoryCard
          v-for="p in parents"
          :key="`${p.id}-${historyRefreshKey}`"
          :profile="p"
        />
      </div>
    </main>

    <CollectEggsDialog v-if="showDialog" :siblings="[]" @submit="submitCollection" @cancel="showDialog = false" />
  </div>
</template>
