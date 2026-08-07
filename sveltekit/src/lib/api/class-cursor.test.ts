import { describe, expect, test } from "vitest";
import { decodeClassCursor, encodeClassCursor } from "./class-cursor";

describe("class cursor", () => {
  test("round-trips a sort key", () => {
    const cursor = { courseCode: "CMSC 128", section: "AB-1L", id: 4321 };
    const token = encodeClassCursor(cursor);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // opaque + URL-safe
    expect(decodeClassCursor(token)).toEqual(cursor);
  });

  test("round-trips empty strings (NULL course/section coalesce to '')", () => {
    const cursor = { courseCode: "", section: "", id: 1 };
    expect(decodeClassCursor(encodeClassCursor(cursor))).toEqual(cursor);
  });

  test.each([
    ["not base64url", "!!!not-a-cursor!!!"],
    ["base64url of non-JSON", Buffer.from("garbage").toString("base64url")],
    ["JSON but not an array", Buffer.from('{"id":1}').toString("base64url")],
    ["wrong arity", Buffer.from('["A","B"]').toString("base64url")],
    ["non-string course", Buffer.from('[1,"B",2]').toString("base64url")],
    ["non-numeric id", Buffer.from('["A","B","2"]').toString("base64url")],
    ["float id", Buffer.from('["A","B",2.5]').toString("base64url")],
    ["empty string", ""],
    ["oversized token", "A".repeat(300)],
  ])("rejects %s", (_name, raw) => {
    expect(decodeClassCursor(raw)).toBeNull();
  });
});
