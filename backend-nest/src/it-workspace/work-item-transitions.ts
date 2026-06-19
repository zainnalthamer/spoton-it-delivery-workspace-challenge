const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  backlog: ['planned'],
  planned: ['in_progress'],
  in_progress: ['qa'],
  qa: ['ready_for_release', 'in_progress'],
  ready_for_release: ['released', 'qa'],
  released: [],
};

export function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true; // no-op, not a real transition
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}