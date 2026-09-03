import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Best-effort message from a server-fn throw, fetch failure, or plain object. */
export function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Response) {
    return error.statusText || fallback;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "object" && error) {
    if ("issues" in error && Array.isArray((error as { issues: unknown }).issues)) {
      const issues = (error as { issues: { message?: string }[] }).issues
        .map((issue) => issue.message)
        .filter((message): message is string => Boolean(message));
      if (issues.length) return issues.join(" ");
    }
    if ("message" in error) {
      const message = (error as { message: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return fallback;
}
