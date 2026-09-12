"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ChangeEvent } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { conductScoreMessages } from "@/i18n/conduct-score-messages";
import { queryKeys } from "@/lib/query-keys";
import { conductScoreService } from "@/services/conduct-scores";
import { eventService } from "@/services/events";

type InputMode = "MANUAL" | "EXCEL";

function uniqueCodes(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isHeader(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return ["mssv", "ma so sinh vien", "student code", "student id"].includes(normalized);
}

export function useBulkConductScoreAdjustment(semesterId: string) {
  const { locale } = useLanguage();
  const messages = conductScoreMessages[locale];
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [criteriaId, setCriteriaId] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("MANUAL");
  const [manualInput, setManualInput] = useState("");
  const [importedCodes, setImportedCodes] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");

  const criteria = useQuery({
    queryKey: [...queryKeys.conductScores.all, "criteria-options"],
    queryFn: () => eventService.criteria(1, undefined, 100),
    staleTime: 10 * 60_000,
  });
  const selectedCriterion = criteria.data?.data.find((item) => item.id === criteriaId) ?? null;
  const manualCodes = useMemo(() => uniqueCodes(manualInput.split(/\r?\n/)), [manualInput]);
  const studentCodes = inputMode === "MANUAL" ? manualCodes : importedCodes;

  const mutation = useMutation({
    mutationFn: () =>
      conductScoreService
        .bulkAdjust({
          operationId: crypto.randomUUID(),
          semesterId,
          criteriaId,
          reason: reason.trim(),
          result: result.trim(),
          studentCodes,
        })
        .then((response) => response.data),
    onSuccess: async (response) => {
      showToast(messages.bulkAdjustmentSuccess.replace("{count}", String(response.applied)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.conductScores.all }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
    onError: () => showToast(messages.bulkAdjustmentError, "error"),
  });

  const importExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileError("");
    setFileName(file.name);
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = await readXlsxFile(file);
      const rows = sheets[0]?.data ?? [];
      const values = rows.map((row) => String(row[0] ?? "").trim()).filter(Boolean);
      if (values[0] && isHeader(values[0])) values.shift();
      const codes = uniqueCodes(values);
      if (!codes.length) throw new Error("EMPTY_FILE");
      if (codes.length > 5_000) throw new Error("TOO_MANY_ROWS");
      setImportedCodes(codes);
    } catch {
      setImportedCodes([]);
      setFileError(messages.invalidExcelFile);
    }
  };

  const close = () => {
    if (mutation.isPending) return;
    setOpen(false);
    mutation.reset();
  };

  return {
    open,
    setOpen,
    close,
    criteria,
    criteriaId,
    setCriteriaId,
    selectedCriterion,
    reason,
    setReason,
    result,
    setResult,
    inputMode,
    setInputMode,
    manualInput,
    setManualInput,
    importedCodes,
    fileName,
    fileError,
    importExcel,
    studentCodes,
    mutation,
    valid:
      Boolean(semesterId && criteriaId) &&
      reason.trim().length >= 5 &&
      Boolean(result.trim()) &&
      studentCodes.length > 0 &&
      studentCodes.length <= 5_000,
  };
}
