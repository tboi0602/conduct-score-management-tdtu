import { describe, expect, it } from "vitest";

import { ApiError } from "../../src/utils/ApiError";
import { runBulkAction } from "../../src/utils/bulkAction";

describe("runBulkAction", () => {
  it("limits concurrency to five while preserving input order", async () => {
    const ids = Array.from({ length: 14 }, (_, index) => `item-${index}`);
    let active = 0;
    let maximumActive = 0;

    const result = await runBulkAction(ids, async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    });

    expect(maximumActive).toBe(5);
    expect(result.succeededIds).toEqual(ids);
    expect(result.failed).toEqual([]);
  });

  it("continues after failures and returns failures in input order", async () => {
    const result = await runBulkAction(["one", "two", "three", "four"], async (id) => {
      if (id === "two" || id === "four") {
        throw new ApiError(409, `Cannot process ${id}`, "ITEM_CONFLICT");
      }
    });

    expect(result.succeededIds).toEqual(["one", "three"]);
    expect(result.failed).toEqual([
      { id: "two", code: "ITEM_CONFLICT", message: "Cannot process two" },
      { id: "four", code: "ITEM_CONFLICT", message: "Cannot process four" },
    ]);
  });
});
