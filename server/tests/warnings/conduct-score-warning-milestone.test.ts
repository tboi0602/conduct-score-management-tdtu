import { describe, expect, it } from "vitest";

import {
  semesterMidpoint,
  warningMilestonesForDate,
} from "@modules/warnings/services/conduct-score-warning-milestone";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const vietnamNoon = (value: string) => new Date(`${value}T05:00:00.000Z`);

describe("conduct score warning milestones", () => {
  it("calculates the middle calendar day between semester dates", () => {
    expect(semesterMidpoint(date("2026-09-01"), date("2027-01-31"))).toEqual(date("2026-11-16"));
  });

  it("returns the midpoint milestone only on the middle day", () => {
    const start = date("2026-09-01");
    const end = date("2027-01-31");

    expect(warningMilestonesForDate(start, end, vietnamNoon("2026-11-15"))).toEqual([]);
    expect(warningMilestonesForDate(start, end, vietnamNoon("2026-11-16"))).toEqual(["MIDPOINT"]);
    expect(warningMilestonesForDate(start, end, vietnamNoon("2026-11-17"))).toEqual([]);
  });

  it("returns the final milestone throughout the last fourteen days", () => {
    const start = date("2026-09-01");
    const end = date("2027-01-31");

    expect(warningMilestonesForDate(start, end, vietnamNoon("2027-01-16"))).toEqual([]);
    expect(warningMilestonesForDate(start, end, vietnamNoon("2027-01-17"))).toEqual([
      "FINAL_WINDOW",
    ]);
    expect(warningMilestonesForDate(start, end, vietnamNoon("2027-01-31"))).toEqual([
      "FINAL_WINDOW",
    ]);
    expect(warningMilestonesForDate(start, end, vietnamNoon("2027-02-01"))).toEqual([]);
  });
});
