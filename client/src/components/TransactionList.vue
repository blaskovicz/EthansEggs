<script setup lang="ts">
import { computed, ref } from "vue";
import { formatCents, formatDate, formatDateTime } from "../lib/format";
import ConfirmDialog from "./ConfirmDialog.vue";
import type { EggCollectionEntry, PaymentEntry, PrizeAward } from "../api/types";

const props = withDefaults(
  defineProps<{
    entries: EggCollectionEntry[];
    payments: PaymentEntry[];
    prizeAwards?: PrizeAward[];
    manageable?: boolean;
  }>(),
  { prizeAwards: () => [], manageable: false }
);

const emit = defineEmits<{
  "edit-collection": [id: string, eggCount: number | null];
  "cancel-collection": [id: string];
  "cancel-payment": [id: string];
  "cancel-prize": [id: string];
}>();

type TimelineItem =
  | { kind: "collection"; id: string; when: string; label: string; amountCents: number; icon: string; eggCount: number | null }
  | { kind: "payment"; id: string; when: string; label: string; amountCents: number; icon: string }
  | { kind: "prize"; id: string; when: string; label: string; amountCents: number; icon: string };

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
      eggCount: e.eggCount,
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
  const prizes: TimelineItem[] = props.prizeAwards.map((p) => ({
    kind: "prize",
    id: p.id,
    when: p.createdAt,
    label: `${p.name} (awarded by ${p.awardedBy.name})`,
    amountCents: -p.priceCents,
    icon: p.icon,
  }));
  return [...collections, ...payments, ...prizes].sort((a, b) => (a.when < b.when ? 1 : -1));
});

const editingId = ref<string | null>(null);
// Vue auto-casts v-model on <input type="number"> to a number (or leaves the
// raw string when it can't parse, e.g. an emptied field) regardless of the
// .number modifier - so this has to accept either.
const editValue = ref<number | string>("");

function startEdit(item: TimelineItem & { kind: "collection" }) {
  editingId.value = item.id;
  editValue.value = item.eggCount ?? "";
}

function cancelEdit() {
  editingId.value = null;
  editValue.value = "";
}

function saveEdit(id: string) {
  const raw = editValue.value;
  const eggCount = raw === "" || raw === null ? null : Number(raw);
  emit("edit-collection", id, eggCount !== null && Number.isNaN(eggCount) ? null : eggCount);
  editingId.value = null;
  editValue.value = "";
}

const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);

async function cancelItem(item: TimelineItem) {
  const ok = await confirmDialog.value!.ask(
    `Cancel "${item.label}" (${formatCents(item.amountCents)})? This can't be undone.`
  );
  if (!ok) return;
  if (item.kind === "collection") emit("cancel-collection", item.id);
  else if (item.kind === "payment") emit("cancel-payment", item.id);
  else emit("cancel-prize", item.id);
}
</script>

<template>
  <div class="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
    <div v-if="timeline.length === 0" class="px-5 py-8 text-center text-sm text-stone-400">
      No activity yet.
    </div>
    <div
      v-for="item in timeline"
      :key="`${item.kind}-${item.id}`"
      class="flex items-center justify-between gap-2 px-5 py-3"
    >
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
          :class="item.kind === 'collection' ? 'bg-amber-100' : item.kind === 'prize' ? 'bg-violet-100' : 'bg-emerald-100'"
        >
          {{ item.icon }}
        </span>
        <div class="min-w-0">
          <template v-if="manageable && item.kind === 'collection' && editingId === item.id">
            <div class="flex items-center gap-1.5">
              <input
                v-model="editValue"
                type="number"
                min="0"
                placeholder="eggs"
                class="w-16 rounded-lg border border-stone-300 px-1.5 py-0.5 text-sm focus:border-amber-500 focus:outline-none"
                @keyup.enter="saveEdit(item.id)"
                @keyup.escape="cancelEdit"
              />
              <button class="text-xs font-medium text-emerald-600 hover:underline" @click="saveEdit(item.id)">Save</button>
              <button class="text-xs text-stone-400 hover:underline" @click="cancelEdit">Cancel</button>
            </div>
          </template>
          <p v-else class="truncate text-sm font-medium text-stone-700">{{ item.label }}</p>
          <p class="text-xs text-stone-400">{{ formatDateTime(item.when) }}</p>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span
          class="text-sm font-semibold"
          :class="item.amountCents >= 0 ? 'text-emerald-600' : 'text-stone-500'"
        >
          {{ item.amountCents >= 0 ? "+" : "" }}{{ formatCents(item.amountCents) }}
        </span>
        <template v-if="manageable">
          <button
            v-if="item.kind === 'collection' && editingId !== item.id"
            class="text-stone-300 hover:text-amber-500"
            title="Edit egg count"
            @click="startEdit(item as TimelineItem & { kind: 'collection' })"
          >
            ✎
          </button>
          <button class="text-stone-300 hover:text-red-500" title="Cancel this entry" @click="cancelItem(item)">
            ✕
          </button>
        </template>
      </div>
    </div>
  </div>

  <ConfirmDialog ref="confirmDialog" />
</template>
