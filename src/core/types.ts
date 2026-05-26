export type RemovalSource = 'mod' | 'automod-filter' | 'automod-remove' | 'spam';
export type ItemType = 'post' | 'comment';

export interface RemovalEvent {
  itemId: string;       // t3_... (post) or t1_... (comment)
  itemType: ItemType;
  author: string;
  subreddit: string;
  source: RemovalSource;
  rawReason?: string;   // reason text present on the trigger payload, if any
  ruleRef?: string;     // matched rule/reason title, if known
  modName?: string;     // acting moderator (or "AutoModerator")
  ts: number;           // epoch ms
}

export type ReasonTier = 'filter-reason' | 'mod-log' | 'rule-config' | 'derived' | 'generic';
export interface ResolvedReason { text: string; tier: ReasonTier; ruleRef?: string }

export type AppealStatus = 'none' | 'appealed' | 'upheld' | 'overturned';
export interface ReceiptRecord {
  itemId: string;
  author: string;
  itemType: ItemType;
  source: RemovalSource;
  reasonText: string;
  reasonTier: ReasonTier;
  ruleRef?: string;
  deliveredVia: string;      // e.g. "comment+modmail" | "modmail" | "none"
  modName?: string;
  ts: number;
  appealStatus: AppealStatus;
  appealedAt?: number;
  subreddit?: string;        // sub the removal happened in (for rule-scoped indexes)
}
