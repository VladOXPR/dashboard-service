import { twMerge } from "tailwind-merge";

type ClassValue = string | number | boolean | null | undefined | ClassValue[] | { [key: string]: unknown };

function toClassString(input: ClassValue): string {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (typeof input === "number") return String(input);
  if (Array.isArray(input)) {
    return input.map(toClassString).filter(Boolean).join(" ");
  }
  if (typeof input === "object") {
    const out: string[] = [];
    for (const key of Object.keys(input)) {
      if (input[key]) out.push(key);
    }
    return out.join(" ");
  }
  return "";
}

export function cx(...inputs: ClassValue[]): string {
  return twMerge(inputs.map(toClassString).filter(Boolean).join(" "));
}

export const sortCx = <T extends Record<string, unknown>>(values: T): T => values;
