import { describe, expect, it } from "vitest";
import { careIntent, matchesCareProduct } from "./careChat";

describe("ThelaWala care routing", () => {
  it("routes ticket tracking to ticket records, not food recommendations", () => {
    expect(careIntent("Tiket tracking kariba")).toBe("tickets");
  });
  it("routes complaints to admin support", () => {
    expect(careIntent("I need a refund for wrong items")).toBe("support");
  });
  it("does not recommend food for unrelated questions", () => {
    expect(careIntent("What is the capital of France?")).toBe("other");
  });
  it("matches requested food instead of unrelated items", () => {
    expect(matchesCareProduct("Show momo", "Chicken Momo", "Tarini Stall")).toBe(true);
    expect(matchesCareProduct("Show momo", "Dahi Bara", "Tarini Stall")).toBe(false);
  });
});