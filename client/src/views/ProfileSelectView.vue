<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import type { Profile } from "../api/types";

const auth = useAuthStore();
const router = useRouter();

const selected = ref<Profile | null>(null);
const password = ref("");
const error = ref("");
const loading = ref(false);
const passwordInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  auth.fetchProfiles();
});

const children = computed(() => auth.profiles.filter((p) => p.role === "CHILD"));
const parents = computed(() => auth.profiles.filter((p) => p.role === "PARENT"));

function selectProfile(profile: Profile) {
  selected.value = profile;
  password.value = "";
  error.value = "";
  setTimeout(() => passwordInput.value?.focus(), 50);
}

function backToProfiles() {
  selected.value = null;
  password.value = "";
  error.value = "";
}

async function submit() {
  if (!selected.value) return;
  error.value = "";
  loading.value = true;
  try {
    const user = await auth.login(selected.value.id, password.value);
    router.push({ name: user.role === "PARENT" ? "parent-dashboard" : "child-dashboard" });
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-4 py-10">
    <div class="mb-10 text-center">
      <div class="text-5xl">🥚</div>
      <h1 class="mt-3 text-2xl font-bold text-stone-800">Ethan's Eggs</h1>
      <p class="mt-1 text-sm text-stone-500">Who's collecting today?</p>
    </div>

    <div v-if="!selected" class="w-full max-w-md space-y-8">
      <div>
        <h2 class="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-400">Kids</h2>
        <div class="grid grid-cols-3 gap-4">
          <button
            v-for="p in children"
            :key="p.id"
            class="flex flex-col items-center gap-2 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md"
            @click="selectProfile(p)"
          >
            <span
              class="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
              :style="{ backgroundColor: p.color }"
            >
              {{ p.name[0] }}
            </span>
            <span class="text-sm font-medium text-stone-700">{{ p.name }}</span>
          </button>
        </div>
      </div>

      <div>
        <h2 class="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-400">Parents</h2>
        <div class="grid grid-cols-2 gap-4">
          <button
            v-for="p in parents"
            :key="p.id"
            class="flex flex-col items-center gap-2 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md"
            @click="selectProfile(p)"
          >
            <span
              class="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
              :style="{ backgroundColor: p.color }"
            >
              {{ p.name[0] }}
            </span>
            <span class="text-sm font-medium text-stone-700">{{ p.name }}</span>
          </button>
        </div>
      </div>
    </div>

    <form v-else class="w-full max-w-xs space-y-4" @submit.prevent="submit">
      <div class="flex flex-col items-center gap-2">
        <span
          class="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
          :style="{ backgroundColor: selected.color }"
        >
          {{ selected.name[0] }}
        </span>
        <span class="text-lg font-semibold text-stone-800">{{ selected.name }}</span>
      </div>

      <input
        ref="passwordInput"
        v-model="password"
        type="password"
        placeholder="Password"
        class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-center text-sm focus:border-amber-500 focus:outline-none"
      />

      <p v-if="error" class="text-center text-sm text-red-600">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
      >
        Log in
      </button>
      <button
        type="button"
        class="w-full text-center text-sm text-stone-500 hover:text-stone-700"
        @click="backToProfiles"
      >
        ← Choose someone else
      </button>
    </form>
  </div>
</template>
