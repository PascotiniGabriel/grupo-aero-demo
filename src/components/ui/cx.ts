export function cx(...p: Array<string | false | null | undefined>): string {
  return p.filter(Boolean).join(' ')
}
