import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { useLastUpdated } from "./useLastUpdated";

function mountLastUpdated() {
  let api!: ReturnType<typeof useLastUpdated>;
  const Comp = defineComponent({
    setup() {
      api = useLastUpdated();
      return () => h("div", api.label.value);
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, api };
}

describe("useLastUpdated", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows nothing before the first update", () => {
    const { api } = mountLastUpdated();
    expect(api.label.value).toBe("");
  });

  it("shows 'just now' immediately after an update", () => {
    const { api } = mountLastUpdated();
    api.markUpdated();
    expect(api.label.value).toBe("Updated just now");
  });

  it("counts up in seconds", async () => {
    const { api } = mountLastUpdated();
    api.markUpdated();

    await vi.advanceTimersByTimeAsync(5000);
    expect(api.label.value).toBe("Updated 5s ago");

    await vi.advanceTimersByTimeAsync(10000);
    expect(api.label.value).toBe("Updated 15s ago");
  });

  it("switches to minutes and seconds after 60s", async () => {
    const { api } = mountLastUpdated();
    api.markUpdated();

    await vi.advanceTimersByTimeAsync(90000);
    expect(api.label.value).toBe("Updated 1m 30s ago");
  });

  it("resets to 'just now' on a later markUpdated call", async () => {
    const { api } = mountLastUpdated();
    api.markUpdated();
    await vi.advanceTimersByTimeAsync(30000);
    expect(api.label.value).toBe("Updated 30s ago");

    api.markUpdated();
    expect(api.label.value).toBe("Updated just now");
  });

  it("stops ticking after unmount", async () => {
    const { wrapper, api } = mountLastUpdated();
    api.markUpdated();
    wrapper.unmount();

    await vi.advanceTimersByTimeAsync(10000);
    expect(api.label.value).toBe("Updated just now");
  });
});
