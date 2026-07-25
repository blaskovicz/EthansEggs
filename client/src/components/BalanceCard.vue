<script setup lang="ts">
import { formatCents } from "../lib/format";
import type { ChildBalance } from "../api/types";

defineProps<{ balance: ChildBalance }>();
</script>

<template>
  <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-stone-400">Balance owed</p>
        <p
          class="mt-1 text-3xl font-bold"
          :class="balance.balanceCents > 0 ? 'text-emerald-600' : 'text-stone-400'"
        >
          {{ formatCents(balance.balanceCents) }}
        </p>
      </div>
      <span class="text-4xl">🥚</span>
    </div>

    <div class="mt-4 grid grid-cols-4 gap-2 text-center">
      <div class="rounded-lg bg-stone-50 py-2">
        <p class="text-lg font-semibold text-stone-800">{{ balance.collectionsCount }}</p>
        <p class="text-[11px] text-stone-500">collections</p>
      </div>
      <div class="rounded-lg bg-stone-50 py-2">
        <p class="text-lg font-semibold text-stone-800">{{ formatCents(balance.totalOwedCents) }}</p>
        <p class="text-[11px] text-stone-500">earned</p>
      </div>
      <div class="rounded-lg bg-stone-50 py-2">
        <p class="text-lg font-semibold text-stone-800">{{ formatCents(balance.totalPaidCents) }}</p>
        <p class="text-[11px] text-stone-500">paid</p>
      </div>
      <div class="rounded-lg bg-stone-50 py-2">
        <p class="text-lg font-semibold text-stone-800">{{ formatCents(balance.totalPrizesCents) }}</p>
        <p class="text-[11px] text-stone-500">prizes</p>
      </div>
    </div>
  </div>
</template>
