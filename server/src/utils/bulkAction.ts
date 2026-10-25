import { ApiError } from "@utils/ApiError";

export type BulkActionFailure = {
  id: string;
  code: string;
  message: string;
};

export type BulkActionResult = {
  succeededIds: string[];
  failed: BulkActionFailure[];
};

export async function runBulkAction(
  ids: string[],
  action: (id: string) => Promise<void>,
): Promise<BulkActionResult> {
  const results: Array<{ id: string; failure: BulkActionFailure | null }> = new Array(ids.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < ids.length) {
      const index = nextIndex;
      nextIndex += 1;
      const id = ids[index];
      try {
        await action(id);
        results[index] = { id, failure: null };
      } catch (error) {
        const failure: BulkActionFailure =
          error instanceof ApiError
            ? { id, code: error.code, message: error.message }
            : { id, code: "REQUEST_FAILED", message: "Unable to process this record" };
        results[index] = { id, failure };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, ids.length) }, () => worker()));

  return {
    succeededIds: results.filter(({ failure }) => failure === null).map(({ id }) => id),
    failed: results.flatMap(({ failure }) => (failure ? [failure] : [])),
  };
}
