import { describe, expect, it } from "bun:test";
import {
  floorLabel,
  indoorInstruction,
  parseRoomCode,
} from "./room-code";

describe("parseRoomCode", () => {
  it("reads wing and floor out of the squashed Physical Sciences form", () => {
    // Wing D is the computer science wing; PSD401 is on the 4th floor.
    expect(parseRoomCode("PSD401")).toEqual({
      building: "Physical Sciences Building",
      wing: "D",
      wingLabel: "Wing D (Computer Science)",
      floor: 4,
      room: "01",
      unknown: false,
    });
  });

  it("places the CINTERLABS block on the 4th floor of wing D", () => {
    for (const code of ["PSD401", "PSD402", "PSD403", "PSD404", "PSD405", "PSD406"]) {
      const parsed = parseRoomCode(code);
      expect(parsed.wing).toBe("D");
      expect(parsed.floor).toBe(4);
    }
  });

  it("places the PC labs on the 3rd floor of wing D", () => {
    for (const code of ["PSD300", "PSD301", "PSD304", "PSD308"]) {
      const parsed = parseRoomCode(code);
      expect(parsed.wing).toBe("D");
      expect(parsed.floor).toBe(3);
    }
    // PSD300 is a real room number; the trailing "00" must survive.
    expect(parseRoomCode("PSD300").room).toBe("00");
  });

  it("puts the Systems Research Group room on the 2nd floor", () => {
    const parsed = parseRoomCode("PSD208");
    expect(parsed.floor).toBe(2);
    expect(parsed.room).toBe("08");
  });

  it("reads the spaced-and-hyphenated Biological Sciences form", () => {
    expect(parseRoomCode("BS A-109")).toMatchObject({
      building: "Biological Sciences Building",
      wing: "A",
      floor: 1,
      room: "09",
    });
  });

  it("treats separator and case variants as the same room", () => {
    const canonical = parseRoomCode("PSD401");
    for (const variant of ["ps d-401", "PS D 401", "psd401", " PSD-401 "]) {
      expect(parseRoomCode(variant)).toEqual(canonical);
    }
  });

  it("refuses to read the CAS basement as a wing", () => {
    // "CAS B01" means basement, not wing B. Guessing here would send a student
    // to the wrong end of a building.
    const parsed = parseRoomCode("CAS B01");
    expect(parsed.unknown).toBe(true);
    expect(parsed.wing).toBeNull();
  });

  it("refuses a letter the building does not actually use", () => {
    // Physical Sciences has wings A-D. There is no wing Z.
    expect(parseRoomCode("PSZ401").unknown).toBe(true);
  });

  it("returns unknown rather than guessing on unrecognised codes", () => {
    for (const code of ["", "Lab", "AMPED ABC 161", "CAS A1 401", "DL Umali Hall"]) {
      expect(parseRoomCode(code).unknown).toBe(true);
    }
  });
});

describe("floorLabel", () => {
  it("calls floor 1 the ground floor and ordinals the rest", () => {
    expect(floorLabel(1)).toBe("ground floor");
    expect(floorLabel(2)).toBe("2nd floor");
    expect(floorLabel(3)).toBe("3rd floor");
    expect(floorLabel(4)).toBe("4th floor");
  });
});

describe("indoorInstruction", () => {
  it("leads with wing and floor, then the contributor's prose", () => {
    expect(indoorInstruction("PSD401", "Far stairwell, room is on the left.")).toBe(
      "Wing D (Computer Science), 4th floor. Far stairwell, room is on the left.",
    );
  });

  it("still guides when no prose has been written yet", () => {
    expect(indoorInstruction("PSD208", null)).toBe(
      "Wing D (Computer Science), 2nd floor",
    );
  });

  it("falls back to prose alone when the code cannot be parsed", () => {
    expect(indoorInstruction("CAS A1 401", "Fourth floor, past the landing.")).toBe(
      "Fourth floor, past the landing.",
    );
  });

  it("returns null when there is nothing honest to say", () => {
    expect(indoorInstruction("CAS A1 401", null)).toBeNull();
  });
});
