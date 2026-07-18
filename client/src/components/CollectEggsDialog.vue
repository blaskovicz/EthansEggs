<script setup lang="ts">
import { computed, ref } from "vue";
import type { Profile } from "../api/types";

const props = defineProps<{
  siblings: Profile[]; // other kids not yet marked today; empty/omitted for parents
}>();

const emit = defineEmits<{
  submit: [payload: { eggCount?: number; helperIds?: string[] }];
  cancel: [];
}>();

const step = ref<"count" | "helpers">("count");
const eggCount = ref<number | null>(null);
const selectedHelpers = ref<Set<string>>(new Set());

function adjust(delta: number) {
  const next = (eggCount.value ?? 0) + delta;
  eggCount.value = Math.max(0, next);
}

const MAX_VISIBLE_EGGS = 24;
const eggIcons = computed(() => {
  const count = eggCount.value ?? 0;
  return Array.from({ length: Math.min(count, MAX_VISIBLE_EGGS) }, (_, i) => i);
});
const overflowEggs = computed(() => Math.max(0, (eggCount.value ?? 0) - MAX_VISIBLE_EGGS));

function toggleHelper(id: string) {
  if (selectedHelpers.value.has(id)) {
    selectedHelpers.value.delete(id);
  } else {
    selectedHelpers.value.add(id);
  }
}

function goToHelpersOrSubmit() {
  if (props.siblings.length > 0) {
    step.value = "helpers";
  } else {
    finish();
  }
}

function finish() {
  emit("submit", {
    eggCount: eggCount.value ?? undefined,
    helperIds: selectedHelpers.value.size ? [...selectedHelpers.value] : undefined,
  });
}
</script>

<template>
  <div class="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4" @click.self="emit('cancel')">
    <div class="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
      <template v-if="step === 'count'">
        <div class="text-4xl">🥚</div>
        <h2 class="mt-2 text-lg font-semibold text-stone-800">How many eggs?</h2>
        <p class="mt-1 text-xs text-stone-400">Totally optional — skip if you're not sure!</p>

        <div class="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-lg font-bold text-stone-600 hover:bg-stone-200"
            @click="adjust(-1)"
          >
            −
          </button>
          <input
            v-model.number="eggCount"
            type="number"
            min="0"
            placeholder="?"
            class="w-20 rounded-lg border border-stone-300 py-2 text-center text-2xl font-semibold focus:border-amber-500 focus:outline-none"
          />
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-lg font-bold text-stone-600 hover:bg-stone-200"
            @click="adjust(1)"
          >
            +
          </button>
        </div>

        <TransitionGroup
          v-if="eggIcons.length > 0"
          tag="div"
          name="egg-pop"
          class="mt-4 flex flex-wrap items-center justify-center gap-1"
        >
          <span v-for="i in eggIcons" :key="i" class="text-xl leading-none">🥚</span>
          <span v-if="overflowEggs > 0" key="overflow" class="ml-1 text-sm font-semibold text-stone-500">
            +{{ overflowEggs }}
          </span>
        </TransitionGroup>

        <div class="mt-6 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            @click="
              eggCount = null;
              goToHelpersOrSubmit();
            "
          >
            Skip
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            @click="goToHelpersOrSubmit"
          >
            {{ siblings.length > 0 ? "Next" : "Done!" }}
          </button>
        </div>
      </template>

      <template v-else>
        <div class="text-4xl">🙌</div>
        <h2 class="mt-2 text-lg font-semibold text-stone-800">Did anyone help?</h2>
        <p class="mt-1 text-xs text-stone-400">They'll get credit too!</p>

        <div class="mt-4 space-y-2">
          <button
            v-for="s in siblings"
            :key="s.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition"
            :class="
              selectedHelpers.has(s.id)
                ? 'border-amber-400 bg-amber-50'
                : 'border-stone-200 hover:bg-stone-50'
            "
            @click="toggleHelper(s.id)"
          >
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              :style="{ backgroundColor: s.color }"
            >
              {{ s.name[0] }}
            </span>
            <span class="flex-1 text-sm font-medium text-stone-700">{{ s.name }}</span>
            <span v-if="selectedHelpers.has(s.id)" class="text-amber-500">✓</span>
          </button>
        </div>

        <div class="mt-6 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            @click="finish"
          >
            No one else
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            @click="finish"
          >
            Done!
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.egg-pop-enter-active {
  animation: egg-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes egg-pop {
  from {
    transform: scale(0) rotate(-15deg);
    opacity: 0;
  }
  to {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}
.egg-pop-move {
  transition: transform 0.2s ease;
}
</style>
