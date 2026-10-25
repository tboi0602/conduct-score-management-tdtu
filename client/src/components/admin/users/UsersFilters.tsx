"use client";

import { FilterX, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { IconButton } from "@/components/ui/IconButton";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import type { Faculty, Role, UserFilters } from "@/types/admin";

type UsersFiltersProps = {
  mode?: "STUDENT" | "STAFF";
  searchTerm: string;
  filters: UserFilters;
  faculties: Faculty[];
  roles: Role[];
  onSearchChange: (value: string) => void;
  onApply: (filters: UserFilters) => void;
};

export function UsersFilters({
  mode,
  searchTerm,
  filters,
  faculties,
  roles,
  onSearchChange,
  onApply,
}: UsersFiltersProps) {
  const { t } = useAdminTranslations();
  const [facultyId, setFacultyId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [classId, setClassId] = useState("");
  const [roleId, setRoleId] = useState("");
  const majors = useMemo(
    () => faculties.find((item) => item.id === facultyId)?.majors ?? [],
    [facultyId, faculties],
  );
  const classes = useMemo(
    () => majors.find((item) => item.id === majorId)?.classes ?? [],
    [majorId, majors],
  );
  const apply = (next = { facultyId, majorId, classId, roleId }) =>
    onApply({ ...next, search: filters.search });
  const clear = () => {
    setFacultyId("");
    setMajorId("");
    setClassId("");
    setRoleId("");
    onSearchChange("");
    onApply({});
  };

  return (
    <div className="mt-7 rounded-[22px] border border-[#dce4ef] bg-white p-4 shadow-[0_18px_40px_-28px_rgba(31,67,111,.35)]">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,1fr)_auto]">
        <label className="relative">
          <span className="sr-only">{t.search}</span>
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8ca3]" />
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="min-h-11 w-full rounded-xl border border-[#cdd9e7] pl-10 pr-3 text-sm outline-none transition focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
          />
        </label>
        {!mode ? (
          <>
            <CustomSelect
              value={facultyId}
              onChange={(value) => {
                setFacultyId(value);
                setMajorId("");
                setClassId("");
                apply({ facultyId: value, majorId: "", classId: "", roleId });
              }}
              options={faculties.map((item) => ({
                value: item.id,
                label: `${item.code} — ${item.name}`,
              }))}
              placeholder={t.allFaculties}
            />
            <CustomSelect
              value={majorId}
              onChange={(value) => {
                setMajorId(value);
                setClassId("");
                apply({ facultyId, majorId: value, classId: "", roleId });
              }}
              disabled={!facultyId}
              options={majors.map((item) => ({
                value: item.id,
                label: `${item.code} — ${item.name}`,
              }))}
              placeholder={t.allMajors}
            />
            <CustomSelect
              value={classId}
              onChange={(value) => {
                setClassId(value);
                apply({ facultyId, majorId, classId: value, roleId });
              }}
              disabled={!majorId}
              options={classes.map((item) => ({ value: item.id, label: item.code }))}
              placeholder={t.allClasses}
            />
            <CustomSelect
              value={roleId}
              onChange={(value) => {
                setRoleId(value);
                apply({ facultyId, majorId, classId, roleId: value });
              }}
              options={roles.map((item) => ({ value: item.id, label: item.name }))}
              placeholder={t.allRoles}
            />
            <IconButton label={t.clearFilter} onClick={clear}>
              <FilterX size={17} />
            </IconButton>
          </>
        ) : null}
      </div>
    </div>
  );
}
