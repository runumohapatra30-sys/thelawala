import { expect, test } from "vitest";
import { itemPhotos, validateItemPhotoCount } from "./itemPhotos";

test("a menu item accepts four photos but rejects five", () => {
  expect(validateItemPhotoCount(4)).toBe(true);
  expect(validateItemPhotoCount(5)).toBe(false);
});
test("gallery has at most four images including the primary photo", () => {
  expect(itemPhotos("a", ["a", "b", "c", "d", "e"])).toEqual(["a", "b", "c", "d"]);
});