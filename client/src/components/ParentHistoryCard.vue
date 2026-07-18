<script setup lang="ts">
import { ref } from "vue";
import { http } from "../api/http";
import EggHistoryList from "./EggHistoryList.vue";
import type { ChildOverview, EggCollectionEntry, ParentSummary } from "../api/types";

const props = defineProps<{ parent: ParentSummary; isSelf: boolean }>();

const expanded = ref(false);
const entries = ref<EggCollectionEntry[] | null>(null);
const loading = ref(false);

async function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value && entries.value === null) {
    loading.value = true;
    try {
      const { data } = await http.get<ChildOverview>(`/eggs/user/${props.parent.userId}`);
      entries.value = data.entries;
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
          :style="{ backgroundColor: parent.color }"
        >
          {{ parent.name[0] }}
        </span>
        <div class="text-left">
          <p class="font-medium text-stone-800">{{ parent.name }}{{ isSelf ? " (you)" : "" }}</p>
          <p class="text-xs text-stone-400">{{ parent.collectionsCount }} collections</p>
        </div>
      </div>
      <span class="text-stone-400 transition" :class="expanded ? 'rotate-180' : ''">⌄</span>
    </button>

    <div v-if="expanded" class="border-t border-stone-100 px-5 py-4">
      <div v-if="loading" class="py-6 text-center text-sm text-stone-400">Loading…</div>
      <EggHistoryList v-else-if="entries" :entries="entries" />
    </div>
  </div>
</template>
