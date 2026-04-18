"use client";

type ErrorLike = {
  message?: unknown;
  error_description?: unknown;
  code?: unknown;
  status?: unknown;
};

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;

  if (err && typeof err === "object") {
    const maybe = err as ErrorLike;
    if (typeof maybe.message === "string" && maybe.message.trim()) {
      return maybe.message;
    }
    if (
      typeof maybe.error_description === "string" &&
      maybe.error_description.trim()
    ) {
      return maybe.error_description;
    }

    const parts = [maybe.code, maybe.status]
      .filter((part) => typeof part === "string" || typeof part === "number")
      .map(String);
    if (parts.length > 0) {
      return `Request failed (${parts.join(" / ")})`;
    }
  }

  if (typeof err === "string" && err.trim()) return err;
  return "Something went wrong";
}
