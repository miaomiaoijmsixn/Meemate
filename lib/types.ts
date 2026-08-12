export type CardKind =
  | "recoList"
  | "action"
  | "delivery"
  | "restaurant"
  | "activity"
  | "sport"
  | "trip"
  | "diary"
  | "morning"
  | "reminder"
  | "planSummary"
  | "vote";

/**
 * 今日推荐里的一条。同一样东西可能既能到店又能外卖，
 * 所以用两个布尔位而不是单一 mode，按钮由此推导。
 */
export type RecoItem = {
  key: string;
  /** 菜名或活动名 */
  dish: string;
  /** 店名或场地 */
  shop: string;
  price: number;
  /** 距离文案 */
  walk: string;
  /** 配送时间（吃）或时长（玩） */
  eta?: string;
  reason: string;
  emoji: string;
  hue: number;
  /** 推荐它的 agent，卡上要标出来 */
  by: string;
  canNav: boolean;
  canOrder: boolean;
  orderPlatform?: string;
  /** 同品类相似推荐用它归类 */
  cat?: string;
};

export type Card = {
  id: string;
  kind: CardKind;
  /** recoList 用 */
  items?: RecoItem[];
  /** action 用：按钮文案 */
  label?: string;
  /** 偏好太严被放宽过，卡上要如实说 */
  relaxed?: boolean;
  title: string;
  subtitle?: string;
  image?: string;
  /** 记忆引用行，卡片上必须出现的那一句 */
  reason?: string;
  reasonMemoryId?: string;
  meta?: Record<string, string>;
  tags?: string[];
  emoji?: string;
  hue?: number;
  /** 外链深链，跳转前会先过确认层 */
  deeplink?: string;
  platform?: string;
  body?: string[];
  price?: string;
  distance?: string;
  eta?: string;
};

/** 剧本里的一拍：谁说、说什么、带不带卡、说完停多久 */
export type Beat = {
  speaker: string; // agent id
  text?: string;
  cards?: Card[];
  /** 本拍结束后到下一拍之间的停顿 */
  gapMs?: number;
  /** @ 用户，UI 上高亮左边框 */
  mention?: boolean;
  chips?: string[];
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender: string; // 'user' | agent id
  kind: "text" | "cards" | "system";
  text: string | null;
  payload: string | null;
  mention: number;
  chips: string | null;
  typing_at: number;
  deliver_at: number;
  seq: number;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: string;
  kind: MessageRow["kind"];
  text?: string;
  cards?: Card[];
  mention?: boolean;
  chips?: string[];
  deliverAt: number;
  seq: number;
};

export type Profile = {
  nickname: string;
  area: string;
  avoid: string[];
  taste: string[];
  budget: string;
  weekend: string[];
  wake: string;
  sleep: string;
};

export type TriggerKind =
  | "morning"
  | "lunch"
  | "dinner"
  | "weekend"
  | "diary";
