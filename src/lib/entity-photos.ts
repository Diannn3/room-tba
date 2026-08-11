import { parseImageUrl } from "./r2-upload-core";

export const MAX_ENTITY_PHOTOS = 10;

export type EntityPhoto = {
  url: string;
  attributionName: string | null;
  attributionProfileUrl: string | null;
};

export type PhotoAttribution = {
  name: string;
  profileUrl: string | null;
};

export type ParsedEntityPhotoUrls =
  | { ok: true; provided: boolean; photoUrls: string[] }
  | { ok: false; error: string };

export function parseEntityPhotoUrls(
  value: unknown,
  publicBaseUrl?: string | null,
): ParsedEntityPhotoUrls {
  if (value === undefined) {
    return { ok: true, provided: false, photoUrls: [] };
  }
  if (!Array.isArray(value)) {
    return { ok: false, error: "Photo URLs must be an array" };
  }
  if (value.length > MAX_ENTITY_PHOTOS) {
    return {
      ok: false,
      error: `A maximum of ${MAX_ENTITY_PHOTOS} photos is allowed`,
    };
  }

  const photoUrls: string[] = [];
  const seen = new Set<string>();
  for (const [index, valueAtIndex] of value.entries()) {
    if (typeof valueAtIndex !== "string") {
      return {
        ok: false,
        error: `Photo URL at index ${index} must be a string`,
      };
    }

    const parsed = parseImageUrl(valueAtIndex, publicBaseUrl, "Photo");
    if (!parsed.ok) return parsed;
    if (!parsed.imageUrl) {
      return {
        ok: false,
        error: `Photo URL at index ${index} must be a non-empty HTTPS URL`,
      };
    }
    if (seen.has(parsed.imageUrl)) {
      return { ok: false, error: "Photo URLs must be unique" };
    }

    seen.add(parsed.imageUrl);
    photoUrls.push(parsed.imageUrl);
  }

  return { ok: true, provided: true, photoUrls };
}

export function reconcileEntityPhotos(
  existing: EntityPhoto[],
  requestedUrls: string[],
  attribution: PhotoAttribution,
): EntityPhoto[] {
  const existingByUrl = new Map(existing.map((photo) => [photo.url, photo]));
  const attributionName = attribution.name.trim();
  const attributionProfileUrl = attribution.profileUrl?.trim() || null;

  return requestedUrls.map((url) => {
    const retained = existingByUrl.get(url);
    if (retained) return retained;
    return {
      url,
      attributionName,
      attributionProfileUrl,
    };
  });
}
