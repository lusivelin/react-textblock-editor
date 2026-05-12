type ClassValue = string | number | boolean | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const result: string[] = [];
  for (const input of inputs) {
    if (!input && input !== 0) continue;
    if (typeof input === "string" || typeof input === "number") {
      result.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) result.push(inner);
    }
  }
  return result.join(" ");
}
