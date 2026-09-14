import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { usePolling } from "./usePolling";

function mountWithPolling(callback: () => void | Promise<void>, intervalMs?: number) {
  const Comp = defineComponent({
    setup() {
      usePolling(callback, intervalMs);
      return () => h("div");
    },
  });
  return mount(Comp);
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
}

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the callback on each interval tick while visible", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    mountWithPolling(callback, 1000);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("skips the tick while the document is hidden", async () => {
    setVisibility("hidden");
    const callback = vi.fn().mockResolvedValue(undefined);
    mountWithPolling(callback, 1000);

    await vi.advanceTimersByTimeAsync(3000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not let a failed tick stop future polling", async () => {
    const callback = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(undefined);
    mountWithPolling(callback, 1000);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("stops polling after unmount", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const wrapper = mountWithPolling(callback, 1000);
    wrapper.unmount();

    await vi.advanceTimersByTimeAsync(3000);
    expect(callback).not.toHaveBeenCalled();
  });
});
