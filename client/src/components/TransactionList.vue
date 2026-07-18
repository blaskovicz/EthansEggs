<script setup lang="ts">
import { computed } from "vue";
import { formatCents, formatDate, formatDateTime } from "../lib/format";
import type { EggCollectionEntry, PaymentEntry } from "../api/types";

const props = defineProps<{
  entries: EggCollectionEntry[];
  payments: PaymentEntry[];
}>();

type TimelineItem =
  | { kind: "collection"; id: string; when: string; label: string; amountCents: number; icon: string }
  | { kind: "payment"; id: string; when: string; label: string; amountCents: number; icon: string };

const timeline = computed<TimelineItem[]>(() => {
  const collections: TimelineItem[] = props.entries.map((e) => {
    const verb = e.isHelper ? "Helped collect eggs" : "Collected eggs";
    const eggs = e.eggCount != null ? ` (${e.eggCount} egg${e.eggCount === 1 ? "" : "s"})` : "";
    return {
      kind: "collection",
      id: e.id,
      when: e.createdAt,
      label: `${verb} — ${formatDate(e.date)}${eggs}`,
      amountCents: e.rateCents,
      icon: e.isHelper ? "🙌" : "🥚",
    };
  });
  const payments: TimelineItem[] = props.payments.map((p) => ({
    kind: "payment",
    id: p.id,
    when: p.createdAt,
    label: p.note ? `Paid: ${p.note} (${p.recordedBy.name})` : `Payment from ${p.recordedBy.name}`,
    amountCents: -p.amountCents,
    icon: "💵",
  }));
  return [...collections, ...payments].sort((a, b) => (a.when < b.when ? 1 : -1));
});
</script>

<template>
  <div class="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
    <div v-if="timeline.length === 0" class="px-5 py-8 text-center text-sm text-stone-400">
      No activity yet.
    </div>
    <div
      v-for="item in timeline"
      :key="`${item.kind}-${item.id}`"
      class="flex items-center justify-between px-5 py-3"
    >
      <div class="flex items-center gap-3">
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full text-sm"
          :class="item.kind === 'collection' ? 'bg-amber-100' : 'bg-emerald-100'"
        >
          {{ item.icon }}
        </span>
        <div>
          <p class="text-sm font-medium text-stone-700">{{ item.label }}</p>
          <p class="text-xs text-stone-400">{{ formatDateTime(item.when) }}</p>
        </div>
      </div>
      <span
        class="text-sm font-semibold"
        :class="item.amountCents >= 0 ? 'text-emerald-600' : 'text-stone-500'"
      >
        {{ item.amountCents >= 0 ? "+" : "" }}{{ formatCents(item.amountCents) }}
      </span>
    </div>
  </div>
</template>
