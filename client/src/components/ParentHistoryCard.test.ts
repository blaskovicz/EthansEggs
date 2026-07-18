import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { http } from "../api/http";
import ParentHistoryCard from "./ParentHistoryCard.vue";
import type { ChildOverview, ParentSummary } from "../api/types";

vi.mock("../api/http", () => ({
  http: { get: vi.fn() },
}));

const mockedHttp = vi.mocked(http, true);

beforeEach(() => {
  mockedHttp.get.mockReset();
});

const parent: ParentSummary = { userId: "u1", name: "Zach", color: "#0ea5e9", collectionsCount: 1 };

const overview: ChildOverview = {
  balance: {
    userId: "u1",
    name: "Zach",
    color: "#0ea5e9",
    collectionsCount: 1,
    rateCents: 100,
    totalOwedCents: 100,
    totalPaidCents: 0,
    balanceCents: 100,
  },
  entries: [
    {
      id: "c1",
      userId: "u1",
      date: "2026-07-18",
      eggCount: 2,
      isHelper: false,
      note: null,
      createdAt: "2026-07-18T09:00:00",
    },
  ],
  markedToday: true,
};

describe("ParentHistoryCard", () => {
  it("does not fetch history until expanded", () => {
    mount(ParentHistoryCard, { props: { parent, isSelf: false } });
    expect(mockedHttp.get).not.toHaveBeenCalled();
  });

  it("fetches and displays history on first expand", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: overview });
    const wrapper = mount(ParentHistoryCard, { props: { parent, isSelf: false } });

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(mockedHttp.get).toHaveBeenCalledWith("/eggs/user/u1");
    expect(wrapper.text()).toContain("Collected eggs");
  });

  it("does not refetch on subsequent expand/collapse toggles", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: overview });
    const wrapper = mount(ParentHistoryCard, { props: { parent, isSelf: false } });
    const toggle = wrapper.find("button");

    await toggle.trigger("click");
    await flushPromises();
    await toggle.trigger("click");
    await toggle.trigger("click");
    await flushPromises();

    expect(mockedHttp.get).toHaveBeenCalledTimes(1);
  });

  it("labels the current user as (you)", () => {
    const wrapper = mount(ParentHistoryCard, { props: { parent, isSelf: true } });
    expect(wrapper.text()).toContain("Zach (you)");
  });
});
