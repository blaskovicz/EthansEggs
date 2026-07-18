<script setup lang="ts">
import { ref } from "vue";
import { http } from "../api/http";

const emit = defineEmits<{ close: [] }>();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const error = ref("");
const success = ref(false);
const loading = ref(false);

async function submit() {
  error.value = "";
  if (newPassword.value !== confirmPassword.value) {
    error.value = "New passwords don't match";
    return;
  }
  loading.value = true;
  try {
    await http.post("/auth/change-password", {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    success.value = true;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
      <h2 class="mb-4 text-lg font-semibold text-stone-800">Change password</h2>

      <div v-if="success" class="space-y-4">
        <p class="text-sm text-emerald-700">Password updated!</p>
        <button
          class="w-full rounded-lg bg-stone-800 py-2 text-sm font-medium text-white hover:bg-stone-700"
          @click="emit('close')"
        >
          Done
        </button>
      </div>

      <form v-else class="space-y-3" @submit.prevent="submit">
        <input
          v-model="currentPassword"
          type="password"
          placeholder="Current password"
          class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <input
          v-model="newPassword"
          type="password"
          placeholder="New password"
          class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <input
          v-model="confirmPassword"
          type="password"
          placeholder="Confirm new password"
          class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            class="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
