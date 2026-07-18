import { defineStore } from "pinia";
import { http } from "../api/http";
import type { Profile } from "../api/types";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as Profile | null,
    profiles: [] as Profile[],
    initialized: false,
  }),
  actions: {
    async fetchProfiles() {
      const { data } = await http.get<Profile[]>("/auth/profiles");
      this.profiles = data;
    },
    async fetchMe() {
      try {
        const { data } = await http.get<Profile>("/auth/me");
        this.user = data;
      } catch {
        this.user = null;
      } finally {
        this.initialized = true;
      }
    },
    async login(userId: string, password: string) {
      const { data } = await http.post<Profile>("/auth/login", { userId, password });
      this.user = data;
      return data;
    },
    async logout() {
      await http.post("/auth/logout");
      this.user = null;
    },
  },
});
