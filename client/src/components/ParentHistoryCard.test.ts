import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { http } from "../api/http";
import ParentHistoryCard from "./ParentHistoryCard.vue";
import type { ChildOverview, Profile } from "../api/types";

vi.mock("../api/http", () => ({
  http: { get: vi.fn() },
}));

const mockedHttp = vi.mocked(http, true);

beforeEach(() => {
  mockedHttp.get.mockReset();
});

const profile: Profile = { id: "u1", name: "Ethan", role: "CHILD", color: "#f59e0b" };

const overview: ChildOverview = {
  balance: {
    userId: "u1",
    name: "Ethan",
    color: "#f59e0b",
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
  it("does not fetch the child's history until expanded", () => {
    mount(ParentHistoryCard, { props: { profile } });
    expect(mockedHttp.get).not.toHaveBeenCalled();
  });

  it("fetches and displays history on first expand", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: overview });
    const wrapper = mount(ParentHistoryCard, { props: { profile } });

    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(mockedHttp.get).toHaveBeenCalledWith("/eggs/user/u1");
    expect(wrapper.text()).toContain("Collected eggs");
  });

  it("does not refetch on subsequent expand/collapse toggles", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: overview });
    const wrapper = mount(ParentHistoryCard, { props: { profile } });
    const toggle = wrapper.find("button");

    await toggle.trigger("click");
    await flushPromises();
    await toggle.trigger("click");
    await toggle.trigger("click");
    await flushPromises();

    expect(mockedHttp.get).toHaveBeenCalledTimes(1);
  });
});
