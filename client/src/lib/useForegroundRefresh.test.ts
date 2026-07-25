import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { useForegroundRefresh } from "./useForegroundRefresh";

function mountWithRefresh(callback: () => void | Promise<void>) {
  const Comp = defineComponent({
    setup() {
      useForegroundRefresh(callback);
      return () => h("div");
    },
  });
  return mount(Comp);
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useForegroundRefresh", () => {
  it("calls the callback when the document becomes visible", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    mountWithRefresh(callback);

    setVisibility("visible");
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not call the callback when the document becomes hidden", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    mountWithRefresh(callback);

    setVisibility("hidden");
    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
  });

  it("calls the callback on a persisted pageshow (bfcache restore)", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    mountWithRefresh(callback);

    const event = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(event, "persisted", { value: true });
    window.dispatchEvent(event);
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignores a non-persisted pageshow", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    mountWithRefresh(callback);

    const event = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(event, "persisted", { value: false });
    window.dispatchEvent(event);
    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not overlap a second trigger while the callback is still in flight", async () => {
    let resolveFirst: () => void = () => {};
    const callback = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        })
    );
    mountWithRefresh(callback);

    setVisibility("visible");
    await Promise.resolve();
    setVisibility("hidden");
    setVisibility("visible");
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
    resolveFirst();
  });

  it("stops listening after unmount", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const wrapper = mountWithRefresh(callback);
    wrapper.unmount();

    setVisibility("visible");
    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
  });
});
