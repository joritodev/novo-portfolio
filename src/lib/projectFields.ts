export function toProjectList(
  value: string | string[] | null | undefined
): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

export function toCommaSeparated(
  value: string | string[] | null | undefined
): string {
  return toProjectList(value).join(", ");
}
