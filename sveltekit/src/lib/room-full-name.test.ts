import { describe, expect, test } from "bun:test";
import { isRoomCodeExpansion, pickRoomFullName } from "./room-full-name";

describe("isRoomCodeExpansion", () => {
  test("accepts an acronym token spelled out", () => {
    expect(isRoomCodeExpansion("DSDS MLH", "DSDS Main Lecture Hall")).toBe(
      true,
    );
  });

  test("accepts a truncated word plus an acronym, with extra leading words", () => {
    // #875 maintainer ruling: PHYSIO LR is Animal Physiology Lecture Room.
    expect(
      isRoomCodeExpansion("PHYSIO LR", "Animal Physiology Lecture Room"),
    ).toBe(true);
  });

  test("accepts a bare acronym", () => {
    expect(isRoomCodeExpansion("MLH", "Main Lecture Hall")).toBe(true);
  });

  test("keeps trailing room numbers in order", () => {
    expect(isRoomCodeExpansion("MLH 2", "Main Lecture Hall 2")).toBe(true);
  });

  test("rejects a spelling variant that expands nothing", () => {
    expect(isRoomCodeExpansion("BALH 1", "BALH-1")).toBe(false);
    expect(isRoomCodeExpansion("DSDS MLH", "DSDS  MLH")).toBe(false);
  });

  test("rejects an unrelated alias", () => {
    expect(isRoomCodeExpansion("SWIMMING POOL", "Rest Area")).toBe(false);
    expect(isRoomCodeExpansion("CEAT SHOP", "Shop Room")).toBe(false);
  });

  test("rejects an alias missing one of the code tokens", () => {
    expect(isRoomCodeExpansion("DSDS MLH", "Main Lecture Hall")).toBe(false);
  });

  test("rejects out-of-order words", () => {
    expect(isRoomCodeExpansion("LR PHYSIO", "Physiology Lecture Room")).toBe(
      false,
    );
  });

  test("rejects empty input", () => {
    expect(isRoomCodeExpansion("", "Main Lecture Hall")).toBe(false);
    expect(isRoomCodeExpansion("MLH", "")).toBe(false);
  });
});

describe("pickRoomFullName", () => {
  test("returns null when no alias expands the code", () => {
    expect(pickRoomFullName("BALH 1", ["BALH-1", "balh1"])).toBeNull();
  });

  test("prefers the longest expansion and keeps its original casing", () => {
    expect(
      pickRoomFullName("DSDS MLH", [
        "DSDS-MLH",
        "DSDS Main Lecture Hall",
        "DSDS Main Lec Hall",
      ]),
    ).toBe("DSDS Main Lecture Hall");
  });
});
