<script setup lang="ts">
import { ref } from "vue";
import { http } from "../api/http";
import { formatCents } from "../lib/format";
import ConfirmDialog from "./ConfirmDialog.vue";
import type { Prize } from "../api/types";

defineProps<{ prizes: Prize[] }>();
const emit = defineEmits<{ changed: [] }>();

const showForm = ref(false);
const name = ref("");
const price = ref("");
const icon = ref("🎁");
const submitting = ref(false);
const error = ref("");

async function addPrize() {
  error.value = "";
  const value = Number(price.value);
  if (!name.value.trim()) {
    error.value = "Enter a name";
    return;
  }
  if (!value || value <= 0) {
    error.value = "Enter a valid price";
    return;
  }
  submitting.value = true;
  try {
    await http.post("/prizes", { name: name.value.trim(), price: value, icon: icon.value || "🎁" });
    name.value = "";
    price.value = "";
    icon.value = "🎁";
    showForm.value = false;
    emit("changed");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    submitting.value = false;
  }
}

const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);

async function deletePrize(id: string, name: string) {
  const ok = await confirmDialog.value!.ask(
    `Delete "${name}" from the prize catalog? Past awards of it are kept, but no one can be awarded it again.`
  );
  if (!ok) return;
  await http.delete(`/prizes/${id}`);
  emit("changed");
}
</script>

<template>
  <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-stone-600">Prizes</h2>
      <button
        v-if="!showForm"
        type="button"
        class="text-xs font-medium text-amber-600 hover:underline"
        @click="showForm = true"
      >
        + Add a prize
      </button>
    </div>

    <form v-if="showForm" class="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-amber-50 p-3" @submit.prevent="addPrize">
      <div class="w-16">
        <label class="mb-1 block text-xs text-stone-500">Icon</label>
        <input
          v-model="icon"
          type="text"
          maxlength="8"
          class="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-center text-lg focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div class="flex-[2] min-w-[140px]">
        <label class="mb-1 block text-xs text-stone-500">Name</label>
        <input
          v-model="name"
          type="text"
          placeholder="Ice cream trip"
          class="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <div class="w-24">
        <label class="mb-1 block text-xs text-stone-500">Price</label>
        <input
          v-model="price"
          type="number"
          step="0.01"
          min="0"
          placeholder="5.00"
          class="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        :disabled="submitting"
        class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
      >
        Add
      </button>
      <button
        type="button"
        class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
        @click="showForm = false"
      >
        Cancel
      </button>
      <p v-if="error" class="w-full text-sm text-red-600">{{ error }}</p>
    </form>

    <p v-if="prizes.length === 0" class="mt-3 text-sm text-stone-400">No prizes yet.</p>
    <ul v-else class="mt-3 space-y-1.5">
      <li
        v-for="p in prizes"
        :key="p.id"
        class="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-stone-50"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">{{ p.icon }}</span>
          <span class="text-sm font-medium text-stone-700">{{ p.name }}</span>
          <span class="text-sm text-stone-400">{{ formatCents(p.priceCents) }}</span>
        </div>
        <button class="text-stone-300 hover:text-red-500" title="Delete this prize" @click="deletePrize(p.id, p.name)">✕</button>
      </li>
    </ul>
  </div>

  <ConfirmDialog ref="confirmDialog" />
</template>
