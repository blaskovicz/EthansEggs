import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { http } from "../api/http";
import TodayStatusCard from "./TodayStatusCard.vue";
import type { TodayEntry } from "../api/types";

vi.mock("../api/http", () => ({
  http: { get: vi.fn() },
}));

const mockedHttp = vi.mocked(http, true);

beforeEach(() => {
  mockedHttp.get.mockReset();
});

function entry(overrides: Partial<TodayEntry> = {}): TodayEntry {
  return {
    id: "1",
    userId: "u1",
    date: "2026-07-18",
    eggCount: null,
    isHelper: false,
    createdAt: "2026-07-18T09:00:00",
    user: { name: "Ethan", role: "CHILD", color: "#f59e0b" },
    ...overrides,
  };
}

describe("TodayStatusCard", () => {
  it("shows an empty state when nothing has been collected today", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [] });
    const wrapper = mount(TodayStatusCard);
    await flushPromises();
    expect(wrapper.text()).toContain("No eggs collected yet today.");
  });

  it("describes a child's own collection with egg count", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [entry({ eggCount: 6 })] });
    const wrapper = mount(TodayStatusCard);
    await flushPromises();
    expect(wrapper.text()).toContain("Ethan collected eggs today — 6 eggs");
  });

  it("describes a helper's entry distinctly", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [entry({ isHelper: true, user: { name: "Benedict", role: "CHILD", color: "#10b981" } })] });
    const wrapper = mount(TodayStatusCard);
    await flushPromises();
    expect(wrapper.text()).toContain("Benedict helped collect eggs today");
  });

  it("describes a parent's logged entry with the house icon", async () => {
    mockedHttp.get.mockResolvedValueOnce({
      data: [entry({ user: { name: "Zach", role: "PARENT", color: "#0ea5e9" } })],
    });
    const wrapper = mount(TodayStatusCard);
    await flushPromises();
    expect(wrapper.text()).toContain("Zach logged today's collection");
    expect(wrapper.text()).toContain("🏡");
  });

  it("exposes a reload method that re-fetches", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [] });
    const wrapper = mount(TodayStatusCard);
    await flushPromises();

    mockedHttp.get.mockResolvedValueOnce({ data: [entry()] });
    await (wrapper.vm as any).reload();
    await flushPromises();

    expect(wrapper.text()).toContain("Ethan collected eggs today");
    expect(mockedHttp.get).toHaveBeenCalledTimes(2);
  });
});
