import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { http } from "../api/http";
import PrizeManager from "./PrizeManager.vue";
import type { Prize } from "../api/types";

vi.mock("../api/http", () => ({
  http: { post: vi.fn(), delete: vi.fn() },
}));

const mockedHttp = vi.mocked(http, true);

beforeEach(() => {
  mockedHttp.post.mockReset();
  mockedHttp.delete.mockReset();
});

async function confirmInDialog(wrapper: VueWrapper<any>) {
  await wrapper.findAll("button").find((b) => b.text() === "Confirm")!.trigger("click");
}

async function declineInDialog(wrapper: VueWrapper<any>) {
  await wrapper.findAll("button").find((b) => b.text() === "Cancel")!.trigger("click");
}

function prize(overrides: Partial<Prize> = {}): Prize {
  return {
    id: "p1",
    name: "Ice cream",
    priceCents: 300,
    icon: "🍦",
    createdAt: "2026-07-18T09:00:00",
    ...overrides,
  };
}

describe("PrizeManager", () => {
  it("shows an empty state with no prizes", () => {
    const wrapper = mount(PrizeManager, { props: { prizes: [] } });
    expect(wrapper.text()).toContain("No prizes yet.");
  });

  it("lists existing prizes with icon, name, and price", () => {
    const wrapper = mount(PrizeManager, { props: { prizes: [prize()] } });
    const text = wrapper.text();
    expect(text).toContain("🍦");
    expect(text).toContain("Ice cream");
    expect(text).toContain("$3.00");
  });

  it("submits a new prize and emits changed", async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: prize() });
    const wrapper = mount(PrizeManager, { props: { prizes: [] } });

    await wrapper.find("button").trigger("click"); // + Add a prize
    await wrapper.find("input[placeholder='Ice cream trip']").setValue("Movie night");
    await wrapper.find("input[type='number']").setValue("5");
    await wrapper.find("form").trigger("submit.prevent");
    await Promise.resolve();
    await Promise.resolve();

    expect(mockedHttp.post).toHaveBeenCalledWith("/prizes", { name: "Movie night", price: 5, icon: "🎁" });
    expect(wrapper.emitted("changed")).toHaveLength(1);
  });

  it("shows a validation error instead of submitting when the price is invalid", async () => {
    const wrapper = mount(PrizeManager, { props: { prizes: [] } });
    await wrapper.find("button").trigger("click");
    await wrapper.find("input[placeholder='Ice cream trip']").setValue("Movie night");
    await wrapper.find("form").trigger("submit.prevent");

    expect(mockedHttp.post).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Enter a valid price");
  });

  it("shows a styled confirm dialog naming the prize before deleting", async () => {
    const wrapper = mount(PrizeManager, { props: { prizes: [prize()] } });

    await wrapper.find("button[title='Delete this prize']").trigger("click");

    expect(wrapper.text()).toContain('Delete "Ice cream"');
    expect(mockedHttp.delete).not.toHaveBeenCalled();
  });

  it("deletes a prize and emits changed once confirmed", async () => {
    mockedHttp.delete.mockResolvedValueOnce({ data: { ok: true } });
    const wrapper = mount(PrizeManager, { props: { prizes: [prize()] } });

    await wrapper.find("button[title='Delete this prize']").trigger("click");
    await confirmInDialog(wrapper);
    await Promise.resolve();

    expect(mockedHttp.delete).toHaveBeenCalledWith("/prizes/p1");
    expect(wrapper.emitted("changed")).toHaveLength(1);
  });

  it("does not delete when the confirmation is declined", async () => {
    const wrapper = mount(PrizeManager, { props: { prizes: [prize()] } });

    await wrapper.find("button[title='Delete this prize']").trigger("click");
    await declineInDialog(wrapper);

    expect(mockedHttp.delete).not.toHaveBeenCalled();
    expect(wrapper.emitted("changed")).toBeFalsy();
  });
});
