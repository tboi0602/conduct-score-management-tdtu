"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ChangeEvent } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { attendanceMessages } from "@/i18n/attendance-messages";
import { parseCsv } from "@/lib/csv";
import { attendanceService } from "@/services/attendance";
import type { AttendanceImportResult } from "@/types/attendance";

const studentEmailSuffix = "@student.tdtu.edu.vn";
const identifierHeaders = ["email", "email address", "dia chi email", "mssv", "ma so sinh vien"];
const scoreHeaders = ["score", "points", "point", "diem", "diem so"];

type PreviewStatus = "QUALIFIED" | "BELOW_THRESHOLD" | "INVALID_SCORE" | "INVALID_IDENTIFIER";

type PreviewRow = {
  identifier: string;
  normalized: string | null;
  score: number | null;
  scoreText: string;
  status: PreviewStatus;
};

function cellText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeIdentifier(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    const localPart = email.slice(0, -studentEmailSuffix.length);
    return email.endsWith(studentEmailSuffix) && localPart && !localPart.includes("@")
      ? email
      : null;
  }
  const studentCode = trimmed.toUpperCase();
  return /^[A-Z0-9]{1,20}$/.test(studentCode) ? studentCode : null;
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function findColumn(row: string[], candidates: string[]): number {
  const normalized = row.map(normalizeHeader);
  const exactIndex = normalized.findIndex((header) => candidates.includes(header));
  if (exactIndex >= 0) return exactIndex;
  return normalized.findIndex((header) =>
    candidates.some((candidate) => header.includes(candidate)),
  );
}

function parseScore(value: string): number | null {
  const match = value
    .trim()
    .replace(",", ".")
    .match(/^(-?\d+(?:\.\d+)?)\s*(?:\/\s*\d+(?:\.\d+)?)?$/);
  if (!match) return null;
  const score = Number(match[1]);
  return Number.isFinite(score) ? score : null;
}

export function useAttendanceImport(eventId: string) {
  const { locale } = useAdminTranslations();
  const t = attendanceMessages[locale];
  const { showToast } = useToast();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [identifierColumnIndex, setIdentifierColumnIndex] = useState(0);
  const [scoreColumnIndex, setScoreColumnIndex] = useState<number | null>(null);
  const [minimumScore, setMinimumScore] = useState(6);
  const [confirmed, setConfirmed] = useState(false);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<AttendanceImportResult | null>(null);

  const headerRow = rows[0] ?? [];
  const dataRows = useMemo(
    () => rows.slice(1).filter((row) => row.some((cell) => cellText(cell))),
    [rows],
  );
  const evaluatedRows = useMemo<PreviewRow[]>(
    () =>
      dataRows.map((row) => {
        const identifier = cellText(row[identifierColumnIndex]);
        const normalized = normalizeIdentifier(identifier);
        const scoreText = scoreColumnIndex === null ? "" : cellText(row[scoreColumnIndex]);
        const score = parseScore(scoreText);
        const status: PreviewStatus =
          score === null
            ? "INVALID_SCORE"
            : score < minimumScore
              ? "BELOW_THRESHOLD"
              : normalized
                ? "QUALIFIED"
                : "INVALID_IDENTIFIER";
        return { identifier, normalized, score, scoreText, status };
      }),
    [dataRows, identifierColumnIndex, minimumScore, scoreColumnIndex],
  );
  const qualifiedRows = evaluatedRows.filter(
    (row) => row.score !== null && row.score >= minimumScore,
  );
  const identifiers = qualifiedRows.map((row) => row.identifier);
  const validIdentifiers = qualifiedRows.flatMap((row) => (row.normalized ? [row.normalized] : []));
  const invalidIdentifiers = qualifiedRows
    .filter((row) => row.normalized === null)
    .map((row) => row.identifier);
  const invalidScoreCount = evaluatedRows.filter((row) => row.score === null).length;
  const belowThresholdCount = evaluatedRows.filter(
    (row) => row.score !== null && row.score < minimumScore,
  ).length;
  const counts = new Map<string, number>();
  validIdentifiers.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const duplicateIdentifiers = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
  const uniqueValidIdentifiers = [...counts.keys()];

  const columnOptions = headerRow.map((header, index) => ({
    value: String(index),
    label: cellText(header) || `${t.importColumn} ${index + 1}`,
  }));

  const selectDetectedColumns = (csvRows: string[][]) => {
    const selectedHeader = csvRows[0] ?? [];
    const detectedIdentifier = findColumn(selectedHeader, identifierHeaders);
    const detectedScore = findColumn(selectedHeader, scoreHeaders);
    setIdentifierColumnIndex(detectedIdentifier >= 0 ? detectedIdentifier : 0);
    setScoreColumnIndex(detectedScore >= 0 ? detectedScore : null);
  };

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setFileError("");
    setResult(null);
    setConfirmed(false);
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("INVALID_TYPE");
      const csvRows = parseCsv(await file.text());
      if (!csvRows.length) throw new Error("EMPTY");
      setRows(csvRows);
      selectDetectedColumns(csvRows);
    } catch {
      setRows([]);
      setScoreColumnIndex(null);
      setFileError(t.importInvalidFile);
    }
  };

  const mutation = useMutation({
    mutationFn: () => attendanceService.importAttendance(eventId, { identifiers }),
    onSuccess: ({ data }) => {
      setResult(data);
      void client.invalidateQueries({ queryKey: ["admin", "attendance", eventId, "requests"] });
      showToast(
        data.queued > 0 ? t.importSucceeded.replace("{count}", String(data.queued)) : t.importEmpty,
      );
    },
    onError: () => showToast(t.importError, "error"),
  });

  const close = () => {
    if (mutation.isPending) return;
    setOpen(false);
    setFileName("");
    setRows([]);
    setIdentifierColumnIndex(0);
    setScoreColumnIndex(null);
    setMinimumScore(6);
    setConfirmed(false);
    setFileError("");
    setResult(null);
    mutation.reset();
  };

  return {
    open,
    setOpen,
    close,
    fileName,
    hasRows: rows.length > 0,
    totalRows: dataRows.length,
    identifierColumnIndex,
    setIdentifierColumnIndex: (value: number) => {
      setIdentifierColumnIndex(value);
      setConfirmed(false);
      setResult(null);
    },
    scoreColumnIndex,
    setScoreColumnIndex: (value: number | null) => {
      setScoreColumnIndex(value);
      setConfirmed(false);
      setResult(null);
    },
    minimumScore,
    setMinimumScore: (value: number) => {
      setMinimumScore(value);
      setConfirmed(false);
      setResult(null);
    },
    columnOptions,
    identifiers,
    uniqueValidIdentifiers,
    invalidIdentifiers,
    duplicateIdentifiers,
    invalidScoreCount,
    belowThresholdCount,
    preview: evaluatedRows.slice(0, 5),
    confirmed,
    setConfirmed,
    fileError,
    result,
    readFile,
    mutation,
  };
}
