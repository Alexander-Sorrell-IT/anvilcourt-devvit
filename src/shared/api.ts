// Internal endpoint paths. These must match the trigger/menu/form endpoints
// declared in devvit.json.
export const Endpoint = {
  OnAppInstall: "/internal/on-app-install",
  OnModAction: "/internal/triggers/mod-action",
  OnAutomodFilterPost: "/internal/triggers/automod-filter-post",
  OnAutomodFilterComment: "/internal/triggers/automod-filter-comment",
  OnModMail: "/internal/triggers/modmail",
  MenuLookupUser: "/internal/menu/lookup-user",
  FormLookupUser: "/internal/form/lookup-user",
  MenuRecentLog: "/internal/menu/recent-log",
  MenuCaseFile: "/internal/menu/case-file",
  FormCaseFile: "/internal/form/case-file",
  MenuPublishMirror: "/internal/menu/publish-mirror",
  MenuPrecedentForItem: "/internal/menu/precedent-for-item",
} as const;

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint];
