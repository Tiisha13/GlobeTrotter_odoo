export function generateId(prefix: string = "id"): string {
  const rand = Math.random().toString(36).slice(2);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}


