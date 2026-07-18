<script setup lang="ts">
import { formatDate, formatDateTime } from "../lib/format";
import type { EggCollectionEntry } from "../api/types";

defineProps<{ entries: EggCollectionEntry[] }>();

function labelFor(e: EggCollectionEntry): string {
  const verb = e.isHelper ? "Helped collect eggs" : "Collected eggs";
  const eggs = e.eggCount != null ? ` (${e.eggCount} egg${e.eggCount === 1 ? "" : "s"})` : "";
  return `${verb} — ${formatDate(e.date)}${eggs}`;
}
</script>

<template>
  <div class="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
    <div v-if="entries.length === 0" class="px-5 py-8 text-center text-sm text-stone-400">
      No collections logged yet.
    </div>
    <div v-for="e in entries" :key="e.id" class="flex items-center gap-3 px-5 py-3">
      <span class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm">
        {{ e.isHelper ? "🙌" : "🥚" }}
      </span>
      <div>
        <p class="text-sm font-medium text-stone-700">{{ labelFor(e) }}</p>
        <p class="text-xs text-stone-400">{{ formatDateTime(e.createdAt) }}</p>
      </div>
    </div>
  </div>
</template>
