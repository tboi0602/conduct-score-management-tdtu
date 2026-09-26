"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { semesterService } from "@/services/events";
import { scheduleService } from "@/services/schedules";
import type { ScheduleException } from "@/types/schedule";

const iso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const mondayOf = (date: Date) => {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return iso(copy);
};
export const addDays = (date: string, amount: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return iso(value);
};

type SemesterDateRange = {
  id: string;
  startDate: string;
  endDate: string;
};

const datePart = (value: string) => value.slice(0, 10);

const weekForSemester = (semester: SemesterDateRange) => {
  const today = iso(new Date());
  const startDate = datePart(semester.startDate);
  const endDate = datePart(semester.endDate);
  const focusDate = today < startDate ? startDate : today > endDate ? endDate : today;

  return mondayOf(new Date(`${focusDate}T12:00:00`));
};

export function useStudentSchedule() {
  const client = useQueryClient();
  const [semesterId, setSemesterId] = useState("");
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exceptions, setExceptions] = useState<Map<string, ScheduleException>>(new Map());
  const [defaultDirty, setDefaultDirty] = useState(false);
  const [weekDirty, setWeekDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    { type: "semester"; value: string } | { type: "week"; value: number } | null
  >(null);
  const semesters = useQuery({
    queryKey: queryKeys.semesters.list({}),
    queryFn: () => semesterService.list(1, 100),
    staleTime: 10 * 60_000,
  });
  useEffect(() => {
    if (semesterId || !semesters.data?.data.length) return;

    const today = iso(new Date());
    const activeSemester = semesters.data.data.find(
      (item) => datePart(item.startDate) <= today && today <= datePart(item.endDate),
    );
    const initialSemester = activeSemester ?? semesters.data.data[0];

    setSemesterId(initialSemester.id);
    setWeekStart(weekForSemester(initialSemester));
  }, [semesterId, semesters.data]);
  const schedule = useQuery({
    queryKey: queryKeys.schedules.mine(semesterId),
    queryFn: () => scheduleService.get(semesterId).then((value) => value.data),
    enabled: Boolean(semesterId),
  });
  const week = useQuery({
    queryKey: queryKeys.schedules.week(semesterId, weekStart),
    queryFn: () => scheduleService.week(semesterId, weekStart).then((value) => value.data),
    enabled: Boolean(semesterId),
  });
  useEffect(() => {
    if (!schedule.data || defaultDirty) return;
    setSelected(
      new Set(schedule.data.slots.map((slot) => `${slot.dayOfWeek}:${slot.classSessionId}`)),
    );
  }, [schedule.data, defaultDirty]);
  useEffect(() => {
    if (!week.data || weekDirty) return;
    setExceptions(
      new Map(week.data.exceptions.map((item) => [`${item.date}:${item.classSessionId}`, item])),
    );
  }, [week.data, weekDirty]);
  const saveDefault = useMutation({
    mutationFn: () =>
      scheduleService.replace(
        semesterId,
        [...selected].map((key) => {
          const [dayOfWeek, classSessionId] = key.split(":");
          return { dayOfWeek: Number(dayOfWeek), classSessionId };
        }),
      ),
    onSuccess: async () => {
      setDefaultDirty(false);
      setWeekDirty(false);
      await client.invalidateQueries({ queryKey: queryKeys.schedules.all });
      await client.invalidateQueries({ queryKey: queryKeys.studentEvents.all });
    },
  });
  const saveWeek = useMutation({
    mutationFn: () => scheduleService.replaceWeek(semesterId, weekStart, [...exceptions.values()]),
    onSuccess: async () => {
      setWeekDirty(false);
      await client.invalidateQueries({ queryKey: queryKeys.schedules.week(semesterId, weekStart) });
      await client.invalidateQueries({ queryKey: queryKeys.studentEvents.all });
    },
  });
  const changeSemester = (value: string) => {
    if (defaultDirty || weekDirty) {
      setPendingNavigation({ type: "semester", value });
      return;
    }
    setDefaultDirty(false);
    setWeekDirty(false);
    setSemesterId(value);
    const semester = semesters.data?.data.find((item) => item.id === value);
    if (semester) setWeekStart(weekForSemester(semester));
  };
  const changeWeek = (amount: number) => {
    if (weekDirty) {
      setPendingNavigation({ type: "week", value: amount });
      return;
    }
    setWeekDirty(false);
    setWeekStart((current) => addDays(current, amount * 7));
  };
  return {
    semesterId,
    changeSemester,
    weekStart,
    changeWeek,
    semesters,
    schedule,
    week,
    selected,
    exceptions,
    defaultDirty,
    weekDirty,
    saveDefault,
    saveWeek,
    toggleDefault: (dayOfWeek: number, sessionId: string) => {
      setSelected((current) => {
        const next = new Set(current);
        const key = `${dayOfWeek}:${sessionId}`;
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
      setDefaultDirty(true);
    },
    toggleException: (date: string, dayOfWeek: number, sessionId: string) => {
      const key = `${date}:${sessionId}`;
      setExceptions((current) => {
        const next = new Map(current);
        if (next.has(key)) next.delete(key);
        else {
          const hasDefault = selected.has(`${dayOfWeek}:${sessionId}`);
          next.set(key, {
            date,
            classSessionId: sessionId,
            status: hasDefault ? "NO_CLASS" : "HAS_CLASS",
          });
        }
        return next;
      });
      setWeekDirty(true);
    },
    days: useMemo(
      () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
      [weekStart],
    ),
    pendingNavigation,
    cancelNavigation: () => setPendingNavigation(null),
    confirmNavigation: () => {
      if (!pendingNavigation) return;
      setDefaultDirty(false);
      setWeekDirty(false);
      if (pendingNavigation.type === "semester") {
        setSemesterId(pendingNavigation.value);
        const semester = semesters.data?.data.find((item) => item.id === pendingNavigation.value);
        if (semester) setWeekStart(weekForSemester(semester));
      } else setWeekStart((current) => addDays(current, pendingNavigation.value * 7));
      setPendingNavigation(null);
    },
  };
}
