import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import EggHistoryList from "./EggHistoryList.vue";
import type { EggCollectionEntry } from "../api/types";

function entry(overrides: Partial<EggCollectionEntry> = {}): EggCollectionEntry {
  return {
    id: "1",
    userId: "u1",
    date: "2026-07-18",
    eggCount: null,
    isHelper: false,
    note: null,
    createdAt: "2026-07-18T12:00:00",
    ...overrides,
  };
}

describe("EggHistoryList", () => {
  it("shows an empty state when there are no entries", () => {
    const wrapper = mount(EggHistoryList, { props: { entries: [] } });
    expect(wrapper.text()).toContain("No collections logged yet.");
  });

  it("labels a direct collection with its egg count", () => {
    const wrapper = mount(EggHistoryList, { props: { entries: [entry({ eggCount: 3 })] } });
    expect(wrapper.text()).toContain("Collected eggs");
    expect(wrapper.text()).toContain("(3 eggs)");
  });

  it("uses singular 'egg' for a count of one", () => {
    const wrapper = mount(EggHistoryList, { props: { entries: [entry({ eggCount: 1 })] } });
    expect(wrapper.text()).toContain("(1 egg)");
  });

  it("omits the egg count parenthetical when null", () => {
    const wrapper = mount(EggHistoryList, { props: { entries: [entry({ eggCount: null })] } });
    expect(wrapper.text()).not.toContain("egg)");
  });

  it("labels a helper entry distinctly from a direct collection", () => {
    const wrapper = mount(EggHistoryList, { props: { entries: [entry({ isHelper: true })] } });
    expect(wrapper.text()).toContain("Helped collect eggs");
  });
});
