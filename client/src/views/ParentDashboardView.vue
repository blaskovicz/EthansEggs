<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppHeader from "../components/AppHeader.vue";
import ParentChildCard from "../components/ParentChildCard.vue";
import { http } from "../api/http";
import type { ChildBalance } from "../api/types";

const children = ref<ChildBalance[]>([]);
const rate = ref<number>(1);
const rateInput = ref<string>("1.00");
const savingRate = ref(false);
const rateSaved = ref(false);
const editingRate = ref(false);

async function loadChildren() {
  const { data } = await http.get<ChildBalance[]>("/users/children");
  children.value = data;
}

async function loadRate() {
  const { data } = await http.get<{ rate: number }>("/settings");
  rate.value = data.rate;
  rateInput.value = data.rate.toFixed(2);
}

onMounted(() => {
  loadChildren();
  loadRate();
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
</script>

<template>
  <div class="min-h-screen pb-16">
    <AppHeader />

    <main class="mx-auto max-w-lg space-y-5 px-4 sm:px-0">
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
    </main>
  </div>
</template>
