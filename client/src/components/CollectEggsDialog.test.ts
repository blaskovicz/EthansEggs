import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CollectEggsDialog from "./CollectEggsDialog.vue";
import type { Profile } from "../api/types";

const siblings: Profile[] = [
  { id: "s1", name: "Benedict", role: "CHILD", color: "#10b981" },
  { id: "s2", name: "Maxine", role: "CHILD", color: "#ec4899" },
];

describe("CollectEggsDialog", () => {
  it("submits immediately with no eggCount/helpers when there are no siblings", async () => {
    const wrapper = mount(CollectEggsDialog, { props: { siblings: [] } });
    await wrapper.find("button.bg-amber-500").trigger("click");

    const submitted = wrapper.emitted("submit");
    expect(submitted).toHaveLength(1);
    expect(submitted![0][0]).toEqual({ eggCount: undefined, helperIds: undefined });
  });

  it("increments and decrements the egg count, never going below zero", async () => {
    const wrapper = mount(CollectEggsDialog, { props: { siblings: [] } });
    const [minus, plus] = wrapper.findAll("button.h-10.w-10");

    await minus.trigger("click");
    expect((wrapper.find("input[type=number]").element as HTMLInputElement).value).toBe("0");

    await plus.trigger("click");
    await plus.trigger("click");
    expect((wrapper.find("input[type=number]").element as HTMLInputElement).value).toBe("2");
  });

  it("advances to the helpers step when siblings exist, then emits selected helpers", async () => {
    const wrapper = mount(CollectEggsDialog, { props: { siblings } });

    await wrapper.find("input[type=number]").setValue(5);
    await wrapper.find("button.bg-amber-500").trigger("click"); // -> helpers step

    expect(wrapper.text()).toContain("Did anyone help?");
    const helperButtons = wrapper.findAll("button.w-full");
    await helperButtons[0].trigger("click"); // select Benedict

    await wrapper.find("button.bg-amber-500").trigger("click"); // finish

    const submitted = wrapper.emitted("submit");
    expect(submitted).toHaveLength(1);
    expect(submitted![0][0]).toEqual({ eggCount: 5, helperIds: ["s1"] });
  });

  it("skip clears the egg count before proceeding", async () => {
    const wrapper = mount(CollectEggsDialog, { props: { siblings: [] } });
    await wrapper.find("input[type=number]").setValue(4);
    await wrapper.find("button.border-stone-300").trigger("click"); // Skip

    const submitted = wrapper.emitted("submit");
    expect(submitted![0][0]).toEqual({ eggCount: undefined, helperIds: undefined });
  });

  it("emits cancel when the backdrop is clicked", async () => {
    const wrapper = mount(CollectEggsDialog, { props: { siblings: [] } });
    await wrapper.find(".fixed.inset-0").trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });
});
