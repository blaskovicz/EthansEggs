<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import ChangePasswordModal from "./ChangePasswordModal.vue";

const auth = useAuthStore();
const router = useRouter();
const showChangePassword = ref(false);
const menuOpen = ref(false);

async function handleLogout() {
  await auth.logout();
  router.push({ name: "profile-select" });
}
</script>

<template>
  <header class="flex items-center justify-between px-5 py-4 sm:px-8">
    <div class="flex items-center gap-2">
      <span class="text-2xl">🥚</span>
      <span class="text-lg font-semibold tracking-tight text-stone-800">Ethan's Eggs</span>
    </div>

    <div v-if="auth.user" class="relative">
      <button
        class="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 shadow-sm ring-1 ring-stone-200 transition hover:bg-white"
        @click="menuOpen = !menuOpen"
      >
        <span
          class="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white"
          :style="{ backgroundColor: auth.user.color }"
        >
          {{ auth.user.name[0] }}
        </span>
        <span class="text-sm font-medium text-stone-700">{{ auth.user.name }}</span>
      </button>

      <div
        v-if="menuOpen"
        class="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-stone-200"
        @click="menuOpen = false"
      >
        <button
          class="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
          @click="showChangePassword = true"
        >
          Change password
        </button>
        <button
          class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          @click="handleLogout"
        >
          Log out
        </button>
      </div>
    </div>
  </header>

  <ChangePasswordModal v-if="showChangePassword" @close="showChangePassword = false" />
</template>
