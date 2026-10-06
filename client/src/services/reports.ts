import { authHttp } from "@/services/http";
import type { StudentReport, StudentReportFilter } from "@/types/admin";

function queryString(filters: StudentReportFilter, page: number, limit = 100) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value && (key !== "search" || value.length >= 3)) query.set(key, value);
  });
  return query.toString();
}

export const reportsService = {
  students: (filters: StudentReportFilter, page = 1, limit = 100) =>
    authHttp<{ ok: true; data: StudentReport }>(
      `/api/v1/reports/students?${queryString(filters, page, limit)}`,
    ),
};
