import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { http } from "../api/http";
import ParentChildCard from "./ParentChildCard.vue";
import type { ChildBalance, ChildOverview, PaymentEntry, Prize, PrizeAward } from "../api/types";

vi.mock("../api/http", () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mockedHttp = vi.mocked(http, true);

beforeEach(() => {
  mockedHttp.get.mockReset();
  mockedHttp.post.mockReset();
  mockedHttp.patch.mockReset();
  mockedHttp.delete.mockReset();
});

const balance: ChildBalance = {
  userId: "u1",
  name: "Ethan",
  color: "#f59e0b",
  collectionsCount: 1,
  rateCents: 100,
  totalOwedCents: 100,
  totalPaidCents: 0,
  totalPrizesCents: 0,
  balanceCents: 100,
};

const overview: ChildOverview = {
  balance,
  entries: [
    {
      id: "c1",
      userId: "u1",
      date: "2026-07-18",
      eggCount: 5,
      isHelper: false,
      rateCents: 100,
      note: null,
      createdAt: "2026-07-18T09:00:00",
    },
  ],
  markedToday: true,
};

const payments: PaymentEntry[] = [];
const prizeAwards: PrizeAward[] = [];
const prizes: Prize[] = [{ id: "pr1", name: "Ice cream", priceCents: 300, icon: "🍦", createdAt: "2026-07-01T00:00:00" }];

function mockLoadDetail() {
  mockedHttp.get.mockImplementation((url: string) => {
    if (url.startsWith("/eggs/user/")) return Promise.resolve({ data: overview });
    if (url.startsWith("/payments/user/")) return Promise.resolve({ data: payments });
    if (url.startsWith("/prizes/awards/user/")) return Promise.resolve({ data: prizeAwards });
    throw new Error(`unexpected GET ${url}`);
  });
}

async function mountExpanded() {
  mockLoadDetail();
  const wrapper = mount(ParentChildCard, { props: { balance, prizes } });
  await wrapper.find("button").trigger("click");
  await flushPromises();
  return wrapper;
}

describe("ParentChildCard", () => {
  it("does not fetch detail until expanded", () => {
    const wrapper = mount(ParentChildCard, { props: { balance, prizes } });
    expect(mockedHttp.get).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain("Log a missed day");
  });

  it("fetches overview, payments, and prize awards on first expand", async () => {
    await mountExpanded();
    expect(mockedHttp.get).toHaveBeenCalledWith("/eggs/user/u1");
    expect(mockedHttp.get).toHaveBeenCalledWith("/payments/user/u1");
    expect(mockedHttp.get).toHaveBeenCalledWith("/prizes/awards/user/u1");
  });

  it("records a payment and reloads", async () => {
    const wrapper = await mountExpanded();
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "pay1" } });

    await wrapper.find("input[placeholder='5.00']").setValue("5");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(mockedHttp.post).toHaveBeenCalledWith("/payments", { childId: "u1", amount: 5, note: undefined });
    expect(wrapper.emitted("changed")).toBeTruthy();
  });

  it("backdates a missed day via the manual entry form", async () => {
    const wrapper = await mountExpanded();
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "manual1" } });

    const addLink = wrapper.findAll("button").find((b) => b.text() === "+ Log a missed day")!;
    await addLink.trigger("click");

    await wrapper.find("input[type='date']").setValue("2026-07-23");
    const eggsInput = wrapper.findAll("input[type='number']").find((i) => (i.element as HTMLInputElement).placeholder === "?")!;
    await eggsInput.setValue("13");

    const backdateForm = wrapper.findAll("form")[1];
    await backdateForm.trigger("submit.prevent");
    await flushPromises();

    expect(mockedHttp.post).toHaveBeenCalledWith("/eggs/manual", { userId: "u1", date: "2026-07-23", eggCount: 13 });
    expect(wrapper.emitted("changed")).toBeTruthy();
  });

  it("awards a prize to the child", async () => {
    const wrapper = await mountExpanded();
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "award1" } });

    const awardButton = wrapper.findAll("button").find((b) => b.text().includes("Ice cream"))!;
    await awardButton.trigger("click");
    await flushPromises();

    expect(mockedHttp.post).toHaveBeenCalledWith("/prizes/pr1/award", { childId: "u1" });
    expect(wrapper.emitted("changed")).toBeTruthy();
  });

  it("forwards a collection edit from TransactionList to PATCH /eggs/:id", async () => {
    const wrapper = await mountExpanded();
    mockedHttp.patch.mockResolvedValueOnce({ data: {} });

    await wrapper.find("button[title='Edit egg count']").trigger("click");
    const input = wrapper.find("input[type='number'][placeholder='eggs']");
    await input.setValue("9");
    const saveButton = wrapper.findAll("button").find((b) => b.text() === "Save")!;
    await saveButton.trigger("click");
    await flushPromises();

    expect(mockedHttp.patch).toHaveBeenCalledWith("/eggs/c1", { eggCount: 9 });
    expect(wrapper.emitted("changed")).toBeTruthy();
  });

  it("forwards a cancel-collection from TransactionList to DELETE /eggs/:id once confirmed", async () => {
    const wrapper = await mountExpanded();
    mockedHttp.delete.mockResolvedValueOnce({ data: { ok: true } });

    await wrapper.find("button[title='Cancel this entry']").trigger("click");
    const confirmButton = wrapper.findAll("button").find((b) => b.text() === "Confirm")!;
    await confirmButton.trigger("click");
    await flushPromises();

    expect(mockedHttp.delete).toHaveBeenCalledWith("/eggs/c1");
    expect(wrapper.emitted("changed")).toBeTruthy();
  });
});
