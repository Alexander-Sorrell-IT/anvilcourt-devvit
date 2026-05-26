// Reddit-backed lookups that feed the core 4-tier reason resolver. Each lookup
// degrades to undefined on any failure so the resolver falls through gracefully.
import { reddit } from "@devvit/web/server";
import type { RemovalEvent } from "../core/types.ts";
import type { ReasonLookups } from "../core/reasonResolver.ts";

/** Build reason lookups bound to a subreddit. */
export function makeReasonLookups(subreddit: string): ReasonLookups {
  return {
    // Tier 2: the moderator/AutoMod reason recorded in the mod log for this item.
    modLogReason: async (itemId: string): Promise<string | undefined> => {
      try {
        const listing = reddit.getModerationLog({ subredditName: subreddit, limit: 50 });
        type LogEntry = {
          target?: { id?: string };
          targetId?: string;
          details?: string;
          description?: string;
        };
        const entries = (await listing.all()) as unknown as ReadonlyArray<LogEntry>;
        for (const e of entries) {
          const targetId = e.target?.id ?? e.targetId;
          if (targetId === itemId) {
            const text = e.details || e.description;
            if (text && text.trim()) return text;
          }
        }
        return undefined;
      } catch (err) {
        console.error("[anvilcourt] modLogReason failed:", err);
        return undefined;
      }
    },

    // Tier 3: the message of a configured subreddit removal reason matching the ruleRef.
    ruleConfigText: async (ruleRef: string | undefined): Promise<string | undefined> => {
      if (!ruleRef) return undefined;
      try {
        const reasons = await reddit.getSubredditRemovalReasons(subreddit);
        const match = reasons.find((r) => r.title === ruleRef || r.id === ruleRef);
        return match?.message;
      } catch (err) {
        console.error("[anvilcourt] ruleConfigText failed:", err);
        return undefined;
      }
    },

    // Tier 4: deterministic re-derivation. Not used in v1 — generic fallback covers it.
    deriveReason: async (_event: RemovalEvent): Promise<string | undefined> => undefined,
  };
}
