<script setup lang="ts">
import { ref } from "vue";
import { http } from "../api/http";
import EggHistoryList from "./EggHistoryList.vue";
import type { ChildOverview, Profile } from "../api/types";

const props = defineProps<{ profile: Profile }>();

const expanded = ref(false);
const overview = ref<ChildOverview | null>(null);
const loading = ref(false);

async function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value && !overview.value) {
    loading.value = true;
    try {
      const { data } = await http.get<ChildOverview>(`/eggs/user/${props.profile.id}`);
      overview.value = data;
    } finally {
      loading.value = false;
    }
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
    <button class="flex w-full items-center justify-between px-5 py-4" @click="toggle">
      <div class="flex items-center gap-3">
        <span
          class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
          :style="{ backgroundColor: profile.color }"
        >
          {{ profile.name[0] }}
        </span>
        <p class="font-medium text-stone-800">{{ profile.name }}</p>
      </div>
      <span class="text-stone-400 transition" :class="expanded ? 'rotate-180' : ''">⌄</span>
    </button>

    <div v-if="expanded" class="border-t border-stone-100 px-5 py-4">
      <div v-if="loading" class="py-6 text-center text-sm text-stone-400">Loading…</div>
      <EggHistoryList v-else-if="overview" :entries="overview.entries" />
    </div>
  </div>
</template>
