import { describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import TransactionList from "./TransactionList.vue";
import type { EggCollectionEntry, PaymentEntry, PrizeAward } from "../api/types";

async function confirmInDialog(wrapper: VueWrapper<any>) {
  await wrapper.findAll("button").find((b) => b.text() === "Confirm")!.trigger("click");
}

async function declineInDialog(wrapper: VueWrapper<any>) {
  await wrapper.findAll("button").find((b) => b.text() === "Cancel")!.trigger("click");
}

function collection(overrides: Partial<EggCollectionEntry> = {}): EggCollectionEntry {
  return {
    id: "c1",
    userId: "u1",
    date: "2026-07-18",
    eggCount: null,
    isHelper: false,
    rateCents: 100,
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

function prizeAward(overrides: Partial<PrizeAward> = {}): PrizeAward {
  return {
    id: "pr1",
    childId: "u1",
    prizeId: "prize1",
    name: "Ice cream",
    priceCents: 300,
    icon: "🍦",
    awardedById: "parent1",
    awardedBy: { name: "Zach" },
    createdAt: "2026-07-19T09:00:00",
    ...overrides,
  };
}

describe("TransactionList", () => {
  it("merges collections and payments sorted newest first", () => {
    const wrapper = mount(TransactionList, {
      props: {
        entries: [collection({ createdAt: "2026-07-17T09:00:00" })],
        payments: [payment({ createdAt: "2026-07-18T09:00:00" })],
      },
    });
    const text = wrapper.text();
    // Payment (07-18) should appear before the collection (07-17) in the DOM order.
    expect(text.indexOf("Payment from Zach")).toBeLessThan(text.indexOf("Collected eggs"));
  });

  it("shows the helper icon and label for helper entries", () => {
    const wrapper = mount(TransactionList, {
      props: { entries: [collection({ isHelper: true })], payments: [] },
    });
    expect(wrapper.text()).toContain("🙌");
    expect(wrapper.text()).toContain("Helped collect eggs");
  });

  it("shows a note-based label for payments with a note", () => {
    const wrapper = mount(TransactionList, {
      props: { entries: [], payments: [payment({ note: "allowance" })] },
    });
    expect(wrapper.text()).toContain("Paid: allowance (Zach)");
  });

  it("falls back to a generic payment label without a note", () => {
    const wrapper = mount(TransactionList, {
      props: { entries: [], payments: [payment({ note: null })] },
    });
    expect(wrapper.text()).toContain("Payment from Zach");
  });

  it("shows each entry's own snapshotted rate, not a single current rate", () => {
    const wrapper = mount(TransactionList, {
      props: {
        entries: [
          collection({ id: "old", date: "2026-07-01", rateCents: 100, createdAt: "2026-07-01T09:00:00" }),
          collection({ id: "new", date: "2026-07-18", rateCents: 50, createdAt: "2026-07-18T09:00:00" }),
        ],
        payments: [],
      },
    });
    const text = wrapper.text();
    expect(text).toContain("+$1.00");
    expect(text).toContain("+$0.50");
  });

  it("shows a prize award as a negative amount with its icon and awarder", () => {
    const wrapper = mount(TransactionList, {
      props: { entries: [], payments: [], prizeAwards: [prizeAward()] },
    });
    const text = wrapper.text();
    expect(text).toContain("Ice cream (awarded by Zach)");
    expect(text).toContain("-$3.00");
    expect(text).toContain("🍦");
  });

  it("hides cancel/edit controls by default", () => {
    const wrapper = mount(TransactionList, {
      props: { entries: [collection()], payments: [payment()], prizeAwards: [prizeAward()] },
    });
    expect(wrapper.find("button[title='Cancel this entry']").exists()).toBe(false);
    expect(wrapper.find("button[title='Edit egg count']").exists()).toBe(false);
  });

  describe("when manageable", () => {
    it("shows a cancel button per row and emits the right event per kind", async () => {
      const wrapper = mount(TransactionList, {
        props: {
          entries: [collection()],
          payments: [payment()],
          prizeAwards: [prizeAward()],
          manageable: true,
        },
      });
      const cancelButtons = wrapper.findAll("button[title='Cancel this entry']");
      expect(cancelButtons).toHaveLength(3);

      await cancelButtons[0].trigger("click");
      await confirmInDialog(wrapper);
      const emitted = wrapper.emitted();
      const kinds = ["cancel-prize", "cancel-payment", "cancel-collection"].filter((k) => emitted[k]);
      expect(kinds).toHaveLength(1);
    });

    it("shows a styled confirm dialog naming the entry and amount, not a native browser dialog", async () => {
      const wrapper = mount(TransactionList, {
        props: { entries: [collection({ eggCount: 5 })], payments: [], manageable: true },
      });
      await wrapper.find("button[title='Cancel this entry']").trigger("click");

      const text = wrapper.text();
      expect(text).toContain("Collected eggs");
      expect(text).toContain("5 eggs");
      expect(text).toContain("$1.00");
      expect(wrapper.emitted("cancel-collection")).toBeFalsy();
    });

    it("does not cancel when the confirmation is declined", async () => {
      const wrapper = mount(TransactionList, {
        props: { entries: [collection()], payments: [], manageable: true },
      });
      await wrapper.find("button[title='Cancel this entry']").trigger("click");
      await declineInDialog(wrapper);

      expect(wrapper.emitted("cancel-collection")).toBeFalsy();
    });

    it("cancels once the confirmation is accepted", async () => {
      const wrapper = mount(TransactionList, {
        props: { entries: [collection({ id: "c1" })], payments: [], manageable: true },
      });
      await wrapper.find("button[title='Cancel this entry']").trigger("click");
      await confirmInDialog(wrapper);

      expect(wrapper.emitted("cancel-collection")).toEqual([["c1"]]);
    });

    it("populates the inline edit input with the current egg count", async () => {
      const wrapper = mount(TransactionList, {
        props: { entries: [collection({ eggCount: 5 })], payments: [], manageable: true },
      });
      await wrapper.find("button[title='Edit egg count']").trigger("click");
      const input = wrapper.find("input[type='number']");
      expect((input.element as HTMLInputElement).value).toBe("5");
    });

    it("emits edit-collection with the new egg count on save", async () => {
      const wrapper = mount(TransactionList, {
        props: { entries: [collection({ id: "c1", eggCount: 5 })], payments: [], manageable: true },
      });
      await wrapper.find("button[title='Edit egg count']").trigger("click");
      const input = wrapper.find("input[type='number']");
      await input.setValue("9");
      const saveButton = wrapper.findAll("button").find((b) => b.text() === "Save")!;
      await saveButton.trigger("click");

      expect(wrapper.emitted("edit-collection")).toEqual([["c1", 9]]);
    });

    it("emits null when the edited egg count is cleared", async () => {
      const wrapper = mount(TransactionList, {
        props: { entries: [collection({ id: "c1", eggCount: 5 })], payments: [], manageable: true },
      });
      await wrapper.find("button[title='Edit egg count']").trigger("click");
      const input = wrapper.find("input[type='number']");
      await input.setValue("");
      const saveButton = wrapper.findAll("button").find((b) => b.text() === "Save")!;
      await saveButton.trigger("click");

      expect(wrapper.emitted("edit-collection")).toEqual([["c1", null]]);
    });
  });
});
