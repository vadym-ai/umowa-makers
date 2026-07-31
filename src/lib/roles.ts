export const roleLabels: Record<string, string> = {
  owner: "Właściciel",
  admin: "Administrator",
  standard: "Standard",
};

export function roleLabel(role: string | null | undefined) {
  if (!role) return "";
  return roleLabels[role] ?? role;
}
