export const MAX_ITEM_PHOTOS = 4;

export function itemPhotos(primary: string | null | undefined, gallery: string[] = []): string[] {
  return [...new Set([primary, ...gallery].filter((url): url is string => Boolean(url?.trim())))].slice(0, MAX_ITEM_PHOTOS);
}

export function validateItemPhotoCount(count: number): boolean {
  return count >= 0 && count <= MAX_ITEM_PHOTOS;
}