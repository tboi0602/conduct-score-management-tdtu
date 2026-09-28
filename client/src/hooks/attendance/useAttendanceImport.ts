"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { attendanceMessages } from "@/i18n/attendance-messages";
import { queryKeys } from "@/lib/query-keys";
import { attendanceService } from "@/services/attendance";
import type { AttendanceDirection, AttendanceImportResult } from "@/types/attendance";

const header = /^(mssv|student\s*(id|code)|mã\s*số\s*sinh\s*viên)$/i;

export function useAttendanceImport(eventId: string) {
  const { locale } = useAdminTranslations();
  const t = attendanceMessages[locale];
  const { showToast } = useToast();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [duplicateCodes, setDuplicateCodes] = useState<string[]>([]);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<AttendanceImportResult | null>(null);

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setFileError("");
    setResult(null);
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = await readXlsxFile(file);
      const values = (sheets[0]?.data ?? [])
        .map((row) =>
          String(row[0] ?? "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean);
      if (values[0] && header.test(values[0])) values.shift();
      const counts = new Map<string, number>();
      values.forEach((code) => counts.set(code, (counts.get(code) ?? 0) + 1));
      const unique = [...counts.keys()];
      if (!unique.length) throw new Error("EMPTY");
      if (values.length > 5_000 || unique.some((code) => code.length > 20))
        throw new Error("INVALID");
      setCodes(unique);
      setDuplicateCodes(unique.filter((code) => (counts.get(code) ?? 0) > 1));
    } catch {
      setCodes([]);
      setDuplicateCodes([]);
      setFileError(t.importInvalidFile);
    }
  };
  const mutation = useMutation({
    mutationFn: (input: { direction: AttendanceDirection; status: "ATTENDED" | "LATE" }) =>
      attendanceService.importAttendance(eventId, { studentCodes: codes, ...input }),
    onSuccess: ({ data }) => {
      setResult(data);
      void client.invalidateQueries({ queryKey: ["admin", "attendance", eventId, "requests"] });
      showToast(t.importQueued.replace("{count}", String(data.queued)));
    },
    onError: () => showToast(t.importError, "error"),
  });
  const close = () => {
    if (mutation.isPending) return;
    setOpen(false);
    setFileName("");
    setCodes([]);
    setDuplicateCodes([]);
    setFileError("");
    setResult(null);
    mutation.reset();
  };
  return {
    open,
    setOpen,
    close,
    fileName,
    codes,
    duplicateCodes,
    fileError,
    result,
    readFile,
    mutation,
  };
}
