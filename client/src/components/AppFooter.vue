<script setup lang="ts">
const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH || "";
</script>

<template>
  <footer v-if="commitHash" class="py-4 text-center text-xs text-stone-400">
    <a
      :href="`https://github.com/blaskovicz/EthansEggs/commit/${commitHash}`"
      target="_blank"
      rel="noopener"
      class="inline-flex items-center gap-1 hover:text-stone-600 hover:underline"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
        <circle cx="12" cy="12" r="3" />
        <line x1="3" y1="12" x2="9" y2="12" />
        <line x1="15" y1="12" x2="21" y2="12" />
      </svg>
      rev: {{ commitHash.substring(0, 7) }}
    </a>
  </footer>
</template>
