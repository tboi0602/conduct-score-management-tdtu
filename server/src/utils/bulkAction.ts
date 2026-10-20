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
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        await action(id);
        return { id, failure: null };
      } catch (error) {
        const failure: BulkActionFailure =
          error instanceof ApiError
            ? { id, code: error.code, message: error.message }
            : { id, code: "REQUEST_FAILED", message: "Unable to process this record" };
        return { id, failure };
      }
    }),
  );

  return {
    succeededIds: results.filter(({ failure }) => failure === null).map(({ id }) => id),
    failed: results.flatMap(({ failure }) => (failure ? [failure] : [])),
  };
}
