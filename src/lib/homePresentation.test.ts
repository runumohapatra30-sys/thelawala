import { expect, test } from "bun:test";
import { isRainWeather } from "./homePresentation";

test("positive current precipitation shows rain", () => {
  expect(isRainWeather(0.2, 3)).toBe(true);
});
test("clear dry weather does not show rain", () => {
  expect(isRainWeather(0, 0)).toBe(false);
});
test("rain showers show rain even between precipitation readings", () => {
  expect(isRainWeather(0, 81)).toBe(true);
});
test("dry snow weather does not show rain", () => {
  expect(isRainWeather(0, 71)).toBe(false);
});