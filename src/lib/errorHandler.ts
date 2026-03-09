import { toast } from "sonner";

/**
 * Centralized error handler.
 * - Logs structured errors only in development.
 * - Optionally shows a user-facing toast.
 */
export function handleError(
  error: unknown,
  context: string,
  options?: {
    showToast?: boolean;
    toastTitle?: string;
    toastDescription?: string;
  }
) {
  if (import.meta.env.DEV) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, message, error);
  }

  if (options?.showToast) {
    toast.error(options.toastTitle ?? "Erro", {
      description: options.toastDescription ?? "Ocorreu um erro inesperado.",
    });
  }
}
