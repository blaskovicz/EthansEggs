import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import TransactionList from "./TransactionList.vue";
import type { EggCollectionEntry, PaymentEntry } from "../api/types";

function collection(overrides: Partial<EggCollectionEntry> = {}): EggCollectionEntry {
  return {
    id: "c1",
    userId: "u1",
    date: "2026-07-18",
    eggCount: null,
    isHelper: false,
    note: null,
    createdAt: "2026-07-18T09:00:00",
    ...overrides,
  };
}

function payment(overrides: Partial<PaymentEntry> = {}): PaymentEntry {
  return {
    id: "p1",
    childId: "u1",
    amountCents: 500,
    note: null,
    recordedById: "parent1",
    recordedBy: { name: "Zach" },
    createdAt: "2026-07-17T09:00:00",
    ...overrides,
  };
}

describe("TransactionList", () => {
  it("merges collections and payments sorted newest first", () => {
    const wrapper = mount(TransactionList, {
      props: {
        entries: [collection({ createdAt: "2026-07-17T09:00:00" })],
        payments: [payment({ createdAt: "2026-07-18T09:00:00" })],
        rateCents: 100,
      },
    });
    const text = wrapper.text();
    // Payment (07-18) should appear before the collection (07-17) in the DOM order.
    expect(text.indexOf("Payment from Zach")).toBeLessThan(text.indexOf("Collected eggs"));
  });

  it("shows the helper icon and label for helper entries", () => {
    const wrapper = mount(TransactionList, {
      props: { entries: [collection({ isHelper: true })], payments: [], rateCents: 100 },
    });
    expect(wrapper.text()).toContain("🙌");
    expect(wrapper.text()).toContain("Helped collect eggs");
  });

  it("shows a note-based label for payments with a note", () => {
    const wrapper = mount(TransactionList, {
      props: { entries: [], payments: [payment({ note: "allowance" })], rateCents: 100 },
    });
    expect(wrapper.text()).toContain("Paid: allowance (Zach)");
  });

  it("falls back to a generic payment label without a note", () => {
    const wrapper = mount(TransactionList, {
      props: { entries: [], payments: [payment({ note: null })], rateCents: 100 },
    });
    expect(wrapper.text()).toContain("Payment from Zach");
  });
});
