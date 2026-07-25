import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BalanceCard from "./BalanceCard.vue";
import type { ChildBalance } from "../api/types";

const balance: ChildBalance = {
  userId: "1",
  name: "Ethan",
  color: "#f59e0b",
  collectionsCount: 4,
  rateCents: 100,
  totalOwedCents: 400,
  totalPaidCents: 150,
  totalPrizesCents: 0,
  balanceCents: 250,
};

describe("BalanceCard", () => {
  it("renders formatted balance, earned, and paid amounts", () => {
    const wrapper = mount(BalanceCard, { props: { balance } });
    const text = wrapper.text();
    expect(text).toContain("$2.50");
    expect(text).toContain("$4.00");
    expect(text).toContain("$1.50");
    expect(text).toContain("4");
  });

  it("renders the amount spent on prizes", () => {
    const wrapper = mount(BalanceCard, { props: { balance: { ...balance, totalPrizesCents: 300 } } });
    expect(wrapper.text()).toContain("$3.00");
    expect(wrapper.text()).toContain("prizes");
  });
});
