import type { Request, Response } from "express";

import { getStudentReport } from "@modules/reports";
import type { AuthContext } from "@middleware/auth.middleware";
import { enumInput, optionalQuery, searchInput, uuidInput } from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";
import { ApiError } from "@utils/ApiError";

export async function studentReport(req: Request, res: Response): Promise<void> {
  const semesterId = optionalQuery(req.query.semesterId, (value) => uuidInput(value, "semesterId"));
  const ranking = optionalQuery(req.query.ranking, (value) =>
    enumInput(
      value,
      ["EXCELLENT", "GOOD", "FAIR", "AVERAGE", "POOR", "UNRATED"] as const,
      "ranking",
    ),
  );
  const page = parsePagination(req.query, { maxOffset: 100_000 });
  const pagination = { ...page, limit: Math.min(page.limit, 100) };
  const auth = res.locals.auth as AuthContext;
  const report = await getStudentReport(
    auth.sub,
    semesterId,
    {
      facultyId: optionalQuery(req.query.facultyId, (value) => uuidInput(value, "facultyId")),
      classId: optionalQuery(req.query.classId, (value) => uuidInput(value, "classId")),
      majorId: optionalQuery(req.query.majorId, (value) => uuidInput(value, "majorId")),
      ranking,
      search:
        typeof req.query.search === "string" && req.query.search.trim()
          ? searchInput(req.query.search.trim())
          : undefined,
    },
    pagination,
  );
  res.json({ ok: true, data: report });
}
