"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";

interface ApiErrorLike {
  status?: number;
  message?: string;
}

export interface UseApiOptions<T> {
  successMessage?: string;
  silentError?: boolean;
  onSuccess?: (data: T) => void | Promise<void>;
  onError?: (message: string, rawError: unknown) => void;
}

export function extractServerErrorMessage(error: unknown, serverFallback: string): string {
  const err = error as ApiErrorLike | undefined;
  const status = typeof err?.status === "number" ? err.status : undefined;
  if (status !== undefined && status < 500 && err?.message) {
    return err.message;
  }
  if (status === undefined && error instanceof Error && error.message) {
    return error.message;
  }
  return serverFallback;
}

export function useApi() {
  const { showToast } = useToast();
  const { t } = useAdminTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async <T>(fn: () => Promise<T>, options?: UseApiOptions<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn();
        if (options?.successMessage) {
          showToast(options.successMessage);
        }
        await options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const message = extractServerErrorMessage(err, t.loadError);
        setError(message);
        if (!options?.silentError) {
          showToast(message, "error");
        }
        options?.onError?.(message, err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [showToast, t.loadError],
  );

  return { execute, isLoading, error, clearError: () => setError(null) };
}
