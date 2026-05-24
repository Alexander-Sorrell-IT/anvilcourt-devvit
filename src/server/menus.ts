// Moderator menu actions: look up a user's removal history, and view the recent log.
import { getUserRecords, getRecent } from "./audit.ts";

type Payload = Record<string, unknown>;

function fmtDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export async function lookupUserMenu(): Promise<unknown> {
  return {
    showForm: {
      name: "lookupUser",
      form: {
        title: "Receipts — look up a user",
        acceptLabel: "Search",
        fields: [{ type: "string", name: "username", label: "Username (without u/)" }],
      },
    },
  };
}

export async function lookupUserForm(p: Payload): Promise<unknown> {
  const values = (p?.["values"] ?? {}) as Record<string, unknown>;
  const username = String(values["username"] ?? "")
    .replace(/^u\//, "")
    .trim();
  if (!username) return { showToast: "Enter a username." };

  const records = await getUserRecords(username, 10);
  if (!records.length) return { showToast: `No receipts for u/${username}.` };

  const lines = records.map(
    (r) =>
      `${fmtDate(r.ts)} ${r.itemType} — ${r.reasonText.slice(0, 60)}` +
      (r.appealStatus !== "none" ? ` [${r.appealStatus}]` : ""),
  );
  return { showToast: `u/${username}: ${records.length} removal(s)\n${lines.join("\n")}` };
}

export async function recentLogMenu(): Promise<unknown> {
  const records = await getRecent(15);
  if (!records.length) return { showToast: "No removals logged yet." };
  const lines = records.map((r) => `u/${r.author} ${r.itemType} — ${r.reasonText.slice(0, 50)}`);
  return { showToast: lines.join("\n") };
}
