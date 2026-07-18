<script setup lang="ts">
import { onMounted, ref } from "vue";
import { http } from "../api/http";
import type { TodayEntry } from "../api/types";

const entries = ref<TodayEntry[]>([]);
const loaded = ref(false);

async function load() {
  const { data } = await http.get<TodayEntry[]>("/eggs/today");
  entries.value = data;
  loaded.value = true;
}

onMounted(load);
defineExpose({ reload: load });

function lineFor(e: TodayEntry): string {
  const eggs = e.eggCount != null ? ` — ${e.eggCount} egg${e.eggCount === 1 ? "" : "s"}` : "";
  if (e.user.role === "PARENT") return `${e.user.name} logged today's collection${eggs}`;
  if (e.isHelper) return `${e.user.name} helped collect eggs today${eggs}`;
  return `${e.user.name} collected eggs today${eggs}`;
}

function iconFor(e: TodayEntry): string {
  if (e.user.role === "PARENT") return "🏡";
  if (e.isHelper) return "🙌";
  return "🥚";
}
</script>

<template>
  <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
    <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Today</h2>
    <div v-if="!loaded" class="py-2 text-sm text-stone-400">Loading…</div>
    <p v-else-if="entries.length === 0" class="py-1 text-sm text-stone-500">
      🐣 No eggs collected yet today.
    </p>
    <ul v-else class="space-y-1.5">
      <li
        v-for="e in entries"
        :key="e.id"
        class="flex items-center gap-2 text-sm text-stone-700"
      >
        <span>{{ iconFor(e) }}</span>
        <span>{{ lineFor(e) }}</span>
      </li>
    </ul>
  </div>
</template>
