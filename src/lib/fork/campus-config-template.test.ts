import { describe, expect, test } from "bun:test";
import {
  campusSlug,
  generateCampusConfig,
  vercelDeployUrl,
  type ForkConfig,
} from "./campus-config-template";

const sample: ForkConfig = {
  name: "Sample State University",
  slug: "ssu",
  siteUrl: "https://ssu-room-tba.vercel.app",
  center: [121.241259484605, 14.1632373694632],
  bounds: [
    [121.168, 14.095],
    [121.335, 14.215],
  ],
  defaultZoom: 15.813,
  transitOverlay: true,
  transitLabel: "Jeepney routes",
  terrain: false,
};

describe("campusSlug", () => {
  test("slugifies a campus name", () => {
    expect(campusSlug("University of the Philippines Diliman")).toBe(
      "university-of-the-philippines-diliman",
    );
  });

  test("strips punctuation and collapses spaces", () => {
    expect(campusSlug("  St. Mary's   College! ")).toBe("st-mary-s-college");
  });
});

describe("vercelDeployUrl", () => {
  test("prefills repo, env prompts, and slug-derived project name", () => {
    const url = vercelDeployUrl("ssu");
    expect(url.startsWith("https://vercel.com/new/clone?")).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get("repository-url")).toBe(
      "https://github.com/uplbtools/room-tba",
    );
    expect(params.get("env")).toBe(
      "DATABASE_URL,ADMIN_PASSWORD,ADMIN_SESSION_SECRET,ISR_BYPASS_TOKEN",
    );
    expect(params.get("project-name")).toBe("ssu-room-tba");
  });

  test("URL-encodes the raw href", () => {
    expect(vercelDeployUrl("ssu")).toContain(
      "repository-url=https%3A%2F%2Fgithub.com%2Fuplbtools%2Froom-tba",
    );
  });
});

describe("generateCampusConfig", () => {
  const output = generateCampusConfig(sample);

  test("mirrors the current campus.config.ts exports", () => {
    expect(output).toContain("export const campusSite");
    expect(output).toContain("export const campusMap");
    expect(output).toContain("export const campusCommunity");
  });

  test("swaps in the campus name, URL, camera, and bounds", () => {
    expect(output).toContain(
      "Find Rooms and Buildings at Sample State University",
    );
    expect(output).toContain('url: "https://ssu-room-tba.vercel.app"');
    // Coordinates trimmed to 6 decimals, zoom to 2.
    expect(output).toContain("center: [121.241259, 14.163237]");
    expect(output).toContain("zoom: 15.81");
    expect(output).toContain("[121.168, 14.095]");
    expect(output).toContain("[121.335, 14.215]");
  });

  test("records transit and terrain choices", () => {
    expect(output).toContain(
      'transit overlay: enabled, labeled "Jeepney routes"',
    );
    expect(output).toContain("terrain: disabled");
    const flipped = generateCampusConfig({
      ...sample,
      transitOverlay: false,
      terrain: true,
    });
    expect(flipped).toContain("transit overlay: disabled");
    expect(flipped).toContain("terrain: enabled");
  });

  test("carries community links over as editable placeholders", () => {
    expect(output).toContain("TODO(fork)");
    expect(output).not.toContain("uplbtools.me");
    expect(output).not.toContain("m.me");
  });
});
