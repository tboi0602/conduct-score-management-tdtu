"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { removeCachedEntity, updateCachedEntity } from "@/lib/admin-query-cache";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useToast } from "@/components/ui/ToastProvider";
import { extractServerErrorMessage } from "@/hooks/api/useApi";

export function useCrudManagement<T extends { id: string }, P>({
  service,
  parse,
  queryKey,
  relatedKeys = [],
  onChanged,
}: {
  service: {
    create: (payload: P) => Promise<{ data: T }>;
    update: (id: string, payload: P) => Promise<{ data: T }>;
    delete: (id: string) => Promise<void>;
  };
  parse: (form: FormData) => P;
  queryKey: QueryKey;
  relatedKeys?: QueryKey[];
  onChanged?: (action: "create" | "update" | "delete") => void;
}) {
  const client = useQueryClient();
  const { t } = useAdminTranslations();
  const { showToast } = useToast();
  const busy = useRef(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [notice, setNotice] = useState<"saved" | "deleted" | null>(null);

  async function refresh() {
    // Filter membership and page boundaries can change after a write.
    await Promise.all(
      [queryKey, ...relatedKeys].map((key) => client.invalidateQueries({ queryKey: key })),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setActionError(null);
    try {
      const payload = parse(new FormData(event.currentTarget));
      const response = editing
        ? await service.update(editing.id, payload)
        : await service.create(payload);
      const action = editing ? "update" : "create";
      if (editing) updateCachedEntity(client, queryKey, response.data);
      onChanged?.(action);
      setModalOpen(false);
      setEditing(null);
      setNotice("saved");
      showToast(t.crudSaved);
    } catch (error) {
      setActionError(error);
      showToast(extractServerErrorMessage(error, t.crudSaveError), "error");
      return;
    } finally {
      busy.current = false;
      setSaving(false);
    }
    void refresh().catch(() => undefined);
  }

  async function confirmDelete() {
    if (!deleting || busy.current) return;
    busy.current = true;
    setIsDeleting(true);
    setActionError(null);
    try {
      await service.delete(deleting.id);
      removeCachedEntity(client, queryKey, deleting.id);
      onChanged?.("delete");
      setDeleting(null);
      setNotice("deleted");
      showToast(t.crudDeleted);
    } catch (error) {
      setActionError(error);
      showToast(extractServerErrorMessage(error, t.crudDeleteError), "error");
      return;
    } finally {
      busy.current = false;
      setIsDeleting(false);
    }
    void refresh().catch(() => undefined);
  }

  return {
    editing,
    deleting,
    isModalOpen,
    isSaving,
    isDeleting,
    actionError,
    notice,
    submit,
    confirmDelete,
    openCreate: () => {
      setEditing(null);
      setActionError(null);
      setNotice(null);
      setModalOpen(true);
    },
    openEdit: (item: T) => {
      setEditing(item);
      setActionError(null);
      setNotice(null);
      setModalOpen(true);
    },
    openDelete: (item: T) => {
      setDeleting(item);
      setActionError(null);
      setNotice(null);
    },
    closeModal: () => {
      if (!busy.current) {
        setModalOpen(false);
        setActionError(null);
      }
    },
    closeDelete: () => {
      if (!busy.current) {
        setDeleting(null);
        setActionError(null);
      }
    },
  };
}
