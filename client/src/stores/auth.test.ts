import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { http } from "../api/http";
import { useAuthStore } from "./auth";

vi.mock("../api/http", () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedHttp = vi.mocked(http, true);

beforeEach(() => {
  setActivePinia(createPinia());
  mockedHttp.get.mockReset();
  mockedHttp.post.mockReset();
});

describe("useAuthStore", () => {
  it("fetchProfiles populates the profiles list", async () => {
    const profiles = [{ id: "1", name: "Ethan", role: "CHILD", color: "#fff" }];
    mockedHttp.get.mockResolvedValueOnce({ data: profiles });

    const store = useAuthStore();
    await store.fetchProfiles();

    expect(store.profiles).toEqual(profiles);
    expect(mockedHttp.get).toHaveBeenCalledWith("/auth/profiles");
  });

  it("fetchMe sets the user and marks initialized on success", async () => {
    const me = { id: "1", name: "Ethan", role: "CHILD", color: "#fff" };
    mockedHttp.get.mockResolvedValueOnce({ data: me });

    const store = useAuthStore();
    await store.fetchMe();

    expect(store.user).toEqual(me);
    expect(store.initialized).toBe(true);
  });

  it("fetchMe clears the user but still marks initialized on failure", async () => {
    mockedHttp.get.mockRejectedValueOnce(new Error("Not logged in"));

    const store = useAuthStore();
    store.user = { id: "1", name: "Ethan", role: "CHILD", color: "#fff" };
    await store.fetchMe();

    expect(store.user).toBeNull();
    expect(store.initialized).toBe(true);
  });

  it("login sets the user on success", async () => {
    const me = { id: "1", name: "Ethan", role: "CHILD", color: "#fff" };
    mockedHttp.post.mockResolvedValueOnce({ data: me });

    const store = useAuthStore();
    const result = await store.login("1", "1234");

    expect(result).toEqual(me);
    expect(store.user).toEqual(me);
    expect(mockedHttp.post).toHaveBeenCalledWith("/auth/login", { userId: "1", password: "1234" });
  });

  it("logout clears the user", async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { ok: true } });

    const store = useAuthStore();
    store.user = { id: "1", name: "Ethan", role: "CHILD", color: "#fff" };
    await store.logout();

    expect(store.user).toBeNull();
    expect(mockedHttp.post).toHaveBeenCalledWith("/auth/logout");
  });
});
