<script setup lang="ts">
import { ref } from "vue";

const open = ref(false);
const message = ref("");
let resolver: ((value: boolean) => void) | null = null;

// Imperative ask/respond pair so callers can `await confirmDialog.ask(...)`
// instead of the browser's native confirm(), which can't be restyled.
function ask(msg: string): Promise<boolean> {
  message.value = msg;
  open.value = true;
  return new Promise((resolve) => {
    resolver = resolve;
  });
}

function respond(value: boolean) {
  open.value = false;
  resolver?.(value);
  resolver = null;
}

defineExpose({ ask });
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4"
    @click.self="respond(false)"
  >
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
      <p class="text-sm text-stone-700">{{ message }}</p>
      <div class="mt-5 flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
          @click="respond(false)"
        >
          Cancel
        </button>
        <button
          type="button"
          class="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600"
          @click="respond(true)"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>
