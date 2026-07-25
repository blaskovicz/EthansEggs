import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import PrizeShop from "./PrizeShop.vue";
import type { Prize } from "../api/types";

function prize(overrides: Partial<Prize> = {}): Prize {
  return {
    id: "p1",
    name: "Ice cream",
    priceCents: 100,
    icon: "🍦",
    createdAt: "2026-07-18T09:00:00",
    ...overrides,
  };
}

describe("PrizeShop", () => {
  it("renders nothing when there are no prizes", () => {
    const wrapper = mount(PrizeShop, { props: { prizes: [], balanceCents: 1300 } });
    expect(wrapper.find("h2").exists()).toBe(false);
  });

  it("shows the educational cost breakdown for an affordable prize", () => {
    const wrapper = mount(PrizeShop, { props: { prizes: [prize({ priceCents: 100 })], balanceCents: 1300 } });
    const text = wrapper.text();
    expect(text).toContain("Ice cream");
    expect(text).toContain("$1.00. This will leave you with $13.00 - $1.00 = $12.00");
  });

  it("does not gray out a prize the child can afford", () => {
    const wrapper = mount(PrizeShop, { props: { prizes: [prize({ priceCents: 100 })], balanceCents: 1300 } });
    expect(wrapper.find("li").classes()).not.toContain("opacity-40");
  });

  it("grays out a prize the child cannot afford", () => {
    const wrapper = mount(PrizeShop, { props: { prizes: [prize({ priceCents: 2000 })], balanceCents: 1300 } });
    expect(wrapper.find("li").classes()).toContain("opacity-40");
  });

  it("treats an exact-balance prize as affordable", () => {
    const wrapper = mount(PrizeShop, { props: { prizes: [prize({ priceCents: 1300 })], balanceCents: 1300 } });
    expect(wrapper.find("li").classes()).not.toContain("opacity-40");
  });
});
