import { apiFetch } from "@/lib/api";

export type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  spend_cap_usd: number;
  monthly_spend_usd: number;
  at_cap: boolean;
};

export function listAdminUsers(token: string) {
  return apiFetch<{ items: AdminUser[] }>("/api/admin/users", { token });
}

export function updateSpendCap(token: string, userId: string, spend_cap_usd: number) {
  return apiFetch<{ spend_cap_usd: number; monthly_spend_usd: number }>(
    `/api/admin/users/${userId}/spend-cap`,
    { method: "PATCH", token, body: { spend_cap_usd } }
  );
}
