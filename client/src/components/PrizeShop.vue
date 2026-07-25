<script setup lang="ts">
import { formatCents } from "../lib/format";
import type { Prize } from "../api/types";

const props = defineProps<{ prizes: Prize[]; balanceCents: number }>();

function remainingAfter(priceCents: number): number {
  return props.balanceCents - priceCents;
}

function canAfford(priceCents: number): boolean {
  return remainingAfter(priceCents) >= 0;
}
</script>

<template>
  <div v-if="prizes.length > 0" class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
    <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Prizes</h2>
    <ul class="space-y-2">
      <li
        v-for="p in prizes"
        :key="p.id"
        class="flex items-center gap-3 rounded-xl p-2 transition"
        :class="canAfford(p.priceCents) ? '' : 'opacity-40'"
      >
        <span class="text-2xl">{{ p.icon }}</span>
        <div>
          <p class="text-sm font-medium text-stone-700">{{ p.name }}</p>
          <p class="text-xs text-stone-500">
            {{ formatCents(p.priceCents) }}. This will leave you with
            {{ formatCents(balanceCents) }} - {{ formatCents(p.priceCents) }} =
            {{ formatCents(remainingAfter(p.priceCents)) }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>
