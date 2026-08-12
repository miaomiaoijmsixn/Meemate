import type { Card, CardKind } from "./types";

/**
 * 演示用内容库（半真数据：地点与品类是真实存在的类型，价格与评价为示例）。
 * 真上线时这一层换成高德 POI 搜索加人工运营的活动池。
 */
export type Item = Omit<Card, "id" | "kind"> & {
  key: string;
  kind: CardKind;
  emoji: string;
  hue: number;
  /** 匹配用标签：spicy 辣 / cheap 便宜 / light 清淡 / near 近 / indoor 室内 */
  tags: string[];
  /** 排除原因命中这些标签时不再推 */
  costly?: boolean;
  far?: boolean;
};

export const CATALOG: Item[] = [
  // 外卖
  {
    key: "d1",
    kind: "delivery",
    emoji: "🍲",
    hue: 8,
    title: "蜀香小灶 · 酸辣土豆片盖饭",
    subtitle: "川菜快餐 · 月售 2000+",
    price: "¥26",
    eta: "28 分钟",
    reason: "你说过酸辣口重的更下饭",
    tags: ["spicy", "cheap"],
    meta: { 优惠: "满 25 减 5", 距离: "1.2km" },
    body: ["酸辣土豆片是他家单点最多的一道", "米饭可以选半份，别浪费"],
    platform: "美团外卖",
    deeplink: "https://h5.waimai.meituan.com/waimai/mindex/home",
  },
  {
    key: "d2",
    kind: "delivery",
    emoji: "🍜",
    hue: 28,
    title: "老碗面馆 · 番茄鸡蛋手擀面",
    subtitle: "面食 · 月售 800+",
    price: "¥22",
    eta: "24 分钟",
    reason: "你这周说过晚上不想吃太重的",
    tags: ["light", "cheap"],
    meta: { 优惠: "新客减 4", 距离: "0.9km" },
    body: ["手擀面是现做的，出餐比隔壁慢五分钟但值", "汤底不咸"],
    platform: "美团外卖",
    deeplink: "https://h5.waimai.meituan.com/waimai/mindex/home",
  },
  {
    key: "d3",
    kind: "delivery",
    emoji: "🥘",
    hue: 350,
    title: "麻辣香锅现炒 · 两荤四素",
    subtitle: "香锅 · 月售 1500+",
    price: "¥42",
    eta: "35 分钟",
    reason: "上次你把香锅评了个还行",
    tags: ["spicy"],
    costly: true,
    meta: { 优惠: "无券", 距离: "2.4km" },
    body: ["现炒不是预制，但出餐慢", "微辣就够了，他家中辣偏猛"],
    platform: "美团外卖",
    deeplink: "https://h5.waimai.meituan.com/waimai/mindex/home",
  },
  {
    key: "d4",
    kind: "delivery",
    emoji: "🍗",
    hue: 40,
    title: "隆江猪脚饭 · 加卤蛋",
    subtitle: "快餐 · 月售 3000+",
    price: "¥18",
    eta: "20 分钟",
    reason: "预算带压到 20 以内的话这个最稳",
    tags: ["cheap", "near"],
    meta: { 优惠: "满 18 减 3", 距离: "0.6km" },
    body: ["便宜量大，米饭偏多", "这家不是预制包，能看到现切"],
    platform: "饿了么",
    deeplink: "https://www.ele.me/",
  },
  {
    key: "d5",
    kind: "delivery",
    emoji: "🥗",
    hue: 120,
    title: "轻食碗 · 鸡胸藜麦",
    subtitle: "轻食 · 月售 400+",
    price: "¥32",
    eta: "26 分钟",
    reason: "你说在减脂，这两周先按这个口径推",
    tags: ["light"],
    meta: { 热量: "约 480 大卡", 距离: "1.5km" },
    body: ["酱汁另装，别全倒", "鸡胸有点干，配的是油醋"],
    platform: "美团外卖",
    deeplink: "https://h5.waimai.meituan.com/waimai/mindex/home",
  },
  {
    key: "d6",
    kind: "delivery",
    emoji: "🍱",
    hue: 200,
    title: "食堂式两荤一素 · 家常菜",
    subtitle: "家常菜 · 月售 900+",
    price: "¥24",
    eta: "22 分钟",
    reason: "不想选的时候这家最不会出错",
    tags: ["cheap", "light", "near"],
    meta: { 优惠: "满 20 减 4", 距离: "0.8km" },
    body: ["菜每天换，图跟实物差不多", "汤是免费的"],
    platform: "饿了么",
    deeplink: "https://www.ele.me/",
  },

  // 线下餐厅
  {
    key: "r1",
    kind: "restaurant",
    emoji: "🌶",
    hue: 2,
    title: "小院川菜 · 蒜泥白肉",
    subtitle: "川菜 · 人均 ¥65",
    distance: "步行 8 分钟",
    reason: "你说过酸辣口重的更下饭",
    tags: ["spicy", "near"],
    meta: { 排队: "现在约 10 分钟", 招牌: "蒜泥白肉、藤椒鱼" },
    body: [
      "掌勺的是自贡一路的手法；藤椒不是花椒油兑的，你吃过没",
      "白肉的酱要拌开再夹，别只裹表面",
    ],
    platform: "高德地图",
    deeplink: "https://uri.amap.com/search?keyword=川菜",
  },
  {
    key: "r2",
    kind: "restaurant",
    emoji: "🥟",
    hue: 35,
    title: "巷口面馆 · 炸酱面",
    subtitle: "京味 · 人均 ¥30",
    distance: "步行 12 分钟",
    reason: "上次你说面比米饭省事",
    tags: ["cheap", "near", "light"],
    meta: { 排队: "不用等", 招牌: "炸酱面、麻豆腐" },
    body: ["酱是自己炒的，肉丁比酱多；这一带炸酱面能吃的只剩两家", "麻豆腐第一次吃点小份"],
    platform: "高德地图",
    deeplink: "https://uri.amap.com/search?keyword=炸酱面",
  },
  {
    key: "r3",
    kind: "restaurant",
    emoji: "🍢",
    hue: 18,
    title: "老式烤串 · 炭火腰子",
    subtitle: "烧烤 · 人均 ¥80",
    distance: "打车 9 分钟",
    reason: "你周五晚上通常想吃点热闹的",
    tags: ["spicy"],
    costly: true,
    far: true,
    meta: { 排队: "20 分钟起", 招牌: "腰子、烤面包" },
    body: ["炭是真炭，烟大，别穿好衣服去", "十点后人才散"],
    platform: "高德地图",
    deeplink: "https://uri.amap.com/search?keyword=烧烤",
  },
  {
    key: "r4",
    kind: "restaurant",
    emoji: "🍲",
    hue: 150,
    title: "潮汕砂锅粥 · 蟹粥",
    subtitle: "粥品 · 人均 ¥55",
    distance: "步行 15 分钟",
    reason: "你说晚上不想吃太重的",
    tags: ["light"],
    meta: { 排队: "不用等", 招牌: "蟹粥、卤水拼" },
    body: ["粥是现煮的，两个人点小份就够", "卤水拼盘按两卖，别多点"],
    platform: "高德地图",
    deeplink: "https://uri.amap.com/search?keyword=砂锅粥",
  },

  // 文艺活动
  {
    key: "a1",
    kind: "activity",
    emoji: "🖼",
    hue: 285,
    title: "缓慢的光 · 当代摄影展",
    subtitle: "美术馆 · 展至 9 月 14 日",
    price: "¥68",
    reason: "你选过看展，这类静的东西你待得住",
    tags: ["indoor"],
    meta: { 时间: "10:00 到 18:00", 地点: "798 一带", 时长: "约 90 分钟" },
    body: [
      "这个展不吵，人最少的是周六上午刚开馆那一小时",
      "如果你这周话说得太多了，去看这个比去看演出合适",
    ],
    platform: "大麦",
    deeplink: "https://search.damai.cn/search.htm?keyword=摄影展",
  },
  {
    key: "a2",
    kind: "activity",
    emoji: "🎭",
    hue: 320,
    title: "小剧场话剧 · 两个人的房间",
    subtitle: "话剧 · 周六 19:30",
    price: "¥180",
    reason: "你周末选了演出这一项",
    tags: ["indoor"],
    meta: { 时长: "100 分钟无中场", 地点: "鼓楼一带", 余票: "还有二三十张" },
    body: ["两个演员撑满全场，坐前八排值回票价", "散场十点，赶末班地铁没问题"],
    platform: "大麦",
    deeplink: "https://search.damai.cn/search.htm?keyword=话剧",
  },
  {
    key: "a3",
    kind: "activity",
    emoji: "🎬",
    hue: 250,
    title: "老片重映 · 胶片放映场",
    subtitle: "电影 · 周日 14:00",
    price: "¥45",
    reason: "你说过周末不爱早起，下午场合适",
    tags: ["indoor"],
    meta: { 时长: "134 分钟", 地点: "海淀", 场次: "本周仅一场" },
    body: ["胶片版本，声音会有底噪，那是原样", "这一场排在下午，起晚了也来得及"],
    platform: "猫眼",
    deeplink: "https://www.maoyan.com/",
  },

  // 运动
  {
    key: "s1",
    kind: "sport",
    emoji: "🏃",
    hue: 140,
    title: "奥森五公里 · 慢跑",
    subtitle: "户外 · 约 40 分钟",
    reason: "上次那个五公里你答应了没去",
    tags: ["outdoor"],
    meta: { 强度: "低到中", 天气: "周六上午 24 度，适合", 地点: "奥林匹克森林公园" },
    body: ["南园一圈刚好五公里（配速别急，先跑完）", "九点前人少，十点后晒"],
    platform: "高德地图",
    deeplink: "https://uri.amap.com/search?keyword=奥林匹克森林公园",
  },
  {
    key: "s2",
    kind: "sport",
    emoji: "🧘",
    hue: 170,
    title: "室内普拉提 · 体验课",
    subtitle: "室内 · 60 分钟",
    price: "¥49",
    reason: "下雨或者不想出门时用这个替",
    tags: ["indoor"],
    meta: { 强度: "低", 地点: "五道口一带", 备注: "需提前一天约" },
    body: ["体验课人少，教练会盯你动作", "穿宽松点，不用带垫子"],
    platform: "高德地图",
    deeplink: "https://uri.amap.com/search?keyword=普拉提",
  },
  {
    key: "s3",
    kind: "sport",
    emoji: "🧗",
    hue: 100,
    title: "攀岩馆 · 抱石入门",
    subtitle: "室内 · 90 分钟",
    price: "¥88",
    reason: "你选了运动但没说想练哪块",
    tags: ["indoor"],
    meta: { 强度: "中", 地点: "北四环", 备注: "首次含鞋" },
    body: ["抱石不用绳，第一次去别爬顶", "手会疼两天，正常"],
    platform: "高德地图",
    deeplink: "https://uri.amap.com/search?keyword=攀岩馆",
  },

  // 周边游
  {
    key: "t1",
    kind: "trip",
    emoji: "⛰",
    hue: 205,
    title: "百花山 · 一日往返",
    subtitle: "周边游 · 车程 2 小时",
    reason: "这个季节山上二十度出头，晚两周草就黄了",
    tags: ["outdoor"],
    far: true,
    meta: { 车程: "自驾 2 小时", 人流: "周六上午偏多", 最佳: "七点半前出发" },
    body: ["七点半前出门能避开西六环那段堵", "山上比市区低六七度，带件外套"],
    platform: "高德地图",
    deeplink: "https://uri.amap.com/search?keyword=百花山",
  },
  {
    key: "t2",
    kind: "trip",
    emoji: "🏞",
    hue: 190,
    title: "古北水镇 · 傍晚到夜场",
    subtitle: "周边游 · 车程 1.5 小时",
    price: "¥140",
    reason: "你说过不爱早起，这个下午出发正好",
    tags: ["outdoor"],
    meta: { 车程: "1.5 小时", 人流: "白天多，六点后散", 最佳: "傍晚进园" },
    body: ["下午四点后进园人少一半，灯亮起来才是重点", "回程别晚于十点，高速容易堵"],
    platform: "高德地图",
    deeplink: "https://uri.amap.com/search?keyword=古北水镇",
  },
];

export const byKind = (kind: CardKind) => CATALOG.filter((i) => i.kind === kind);

export const findItem = (key: string) => CATALOG.find((i) => i.key === key);

/* ============================================================
   菜品粒度的内容池。群聊进门的今日推荐和菜单组件都用这一层：
   用户要决策的是「吃哪道菜」，不是「看哪家店」。
   ============================================================ */

export type Dish = {
  key: string;
  dish: string;
  shop: string;
  /** 美食类型，菜单里的类型筛选维度 */
  cat: string;
  price: number;
  /** 到店步行距离（米） */
  walkM: number;
  /** 可外卖时的配送时间（分钟） */
  eta?: number;
  rating: number;
  /** 能到店吃 */
  dine: boolean;
  /** 能点外卖 */
  deliver: boolean;
  reason: string;
  emoji: string;
  hue: number;
  /** 外卖平台与到店导航各一个入口 */
  orderPlatform?: string;
  orderLink?: string;
  navLink: string;
  /** 推荐它的 agent */
  by: string;
  tags: string[];
};

const MT = "https://h5.waimai.meituan.com/waimai/mindex/home";
const ELE = "https://www.ele.me/";
const AMAP = (q: string) => `https://uri.amap.com/search?keyword=${encodeURIComponent(q)}`;

/** d = 可到店，w = 可外卖，dw = 两者都行 */
export const DISHES: Dish[] = [
  // ---- 早餐
  { key: "x15", dish: "小笼包配豆浆", shop: "老巷早点", cat: "早餐", price: 12, walkM: 350, rating: 4.7, dine: true, deliver: false, reason: "现蒸的，七点半前不用排", emoji: "🥟", hue: 38, navLink: AMAP("早点"), by: "laochi", tags: ["cheap", "near"] },
  { key: "x16", dish: "手抓饼加蛋", shop: "校门口摊", cat: "早餐", price: 8, walkM: 200, eta: 15, rating: 4.3, dine: true, deliver: true, reason: "两百米，赶时间就这个", emoji: "🫓", hue: 42, orderPlatform: "饿了么", orderLink: ELE, navLink: AMAP("手抓饼"), by: "waimai", tags: ["cheap", "near"] },
  { key: "x14", dish: "牛油果三明治", shop: "晨光轻食", cat: "早餐", price: 24, walkM: 500, eta: 18, rating: 4.5, dine: true, deliver: true, reason: "早上垫肚子不腻", emoji: "🥪", hue: 100, orderPlatform: "饿了么", orderLink: ELE, navLink: AMAP("轻食"), by: "waimai", tags: ["light", "near"] },
  { key: "x21", dish: "现磨豆浆油条", shop: "永和早点铺", cat: "早餐", price: 10, walkM: 700, eta: 20, rating: 4.4, dine: true, deliver: true, reason: "便宜顶饱，油条是现炸的", emoji: "🥖", hue: 36, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("豆浆"), by: "waimai", tags: ["cheap"] },

  // ---- 快餐
  { key: "x1", dish: "酸辣土豆片盖饭", shop: "蜀香小灶", cat: "快餐", price: 26, walkM: 1200, eta: 28, rating: 4.7, dine: true, deliver: true, reason: "你说酸辣口重的更下饭", emoji: "🍲", hue: 8, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("川菜快餐"), by: "waimai", tags: ["spicy"] },
  { key: "x2", dish: "隆江猪脚饭", shop: "阿民猪脚饭", cat: "快餐", price: 18, walkM: 600, eta: 20, rating: 4.5, dine: true, deliver: true, reason: "二十以内最稳的一口", emoji: "🍗", hue: 40, orderPlatform: "饿了么", orderLink: ELE, navLink: AMAP("猪脚饭"), by: "waimai", tags: ["cheap"] },
  { key: "x3", dish: "两荤一素家常菜", shop: "食堂式小馆", cat: "快餐", price: 24, walkM: 800, rating: 4.4, dine: true, deliver: false, reason: "不想选的时候这家最不会出错", emoji: "🍱", hue: 200, navLink: AMAP("家常菜"), by: "laochi", tags: ["cheap", "light"] },
  { key: "x22", dish: "黄焖鸡米饭", shop: "杨记黄焖鸡", cat: "快餐", price: 22, walkM: 900, eta: 24, rating: 4.6, dine: true, deliver: true, reason: "汤汁拌饭很顶，微辣可选", emoji: "🍛", hue: 30, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("黄焖鸡"), by: "waimai", tags: ["cheap"] },

  // ---- 面食
  { key: "x4", dish: "番茄鸡蛋手擀面", shop: "老碗面馆", cat: "面食", price: 22, walkM: 900, eta: 24, rating: 4.6, dine: true, deliver: true, reason: "晚上不想吃太重的就这个", emoji: "🍜", hue: 28, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("面馆"), by: "waimai", tags: ["light"] },
  { key: "x5", dish: "炸酱面", shop: "巷口面馆", cat: "面食", price: 30, walkM: 950, rating: 4.8, dine: true, deliver: false, reason: "酱是自己炒的，这一带只剩两家", emoji: "🥟", hue: 35, navLink: AMAP("炸酱面"), by: "laochi", tags: ["near"] },
  { key: "x6", dish: "牛肉拉面", shop: "西北面王", cat: "面食", price: 28, walkM: 1500, eta: 30, rating: 4.5, dine: true, deliver: true, reason: "汤是当天熬的，面能要细的", emoji: "🍲", hue: 20, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("拉面"), by: "waimai", tags: [] },
  { key: "x23", dish: "重庆小面", shop: "麻辣鲜香小面", cat: "面食", price: 16, walkM: 1100, eta: 22, rating: 4.6, dine: true, deliver: true, reason: "辣得干脆，十六块吃饱", emoji: "🍝", hue: 5, orderPlatform: "饿了么", orderLink: ELE, navLink: AMAP("重庆小面"), by: "waimai", tags: ["spicy", "cheap"] },

  // ---- 川湘
  { key: "x7", dish: "蒜泥白肉", shop: "小院川菜", cat: "川湘", price: 65, walkM: 700, rating: 4.9, dine: true, deliver: false, reason: "自贡一路的手法，藤椒不是兑的", emoji: "🌶", hue: 2, navLink: AMAP("川菜"), by: "laochi", tags: ["spicy", "near"] },
  { key: "x8", dish: "剁椒鱼头", shop: "湘辣一号", cat: "川湘", price: 38, walkM: 1200, eta: 28, rating: 4.7, dine: true, deliver: true, reason: "微辣可以点，师傅会另给辣碟", emoji: "🐟", hue: 355, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("湘菜"), by: "waimai", tags: ["spicy"] },
  { key: "x9", dish: "麻辣香锅两荤四素", shop: "现炒香锅", cat: "川湘", price: 42, walkM: 2400, eta: 35, rating: 4.3, dine: false, deliver: true, reason: "现炒不是预制，但出餐慢", emoji: "🥘", hue: 350, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("香锅"), by: "waimai", tags: ["spicy"] },
  { key: "x24", dish: "毛血旺", shop: "渝味小馆", cat: "川湘", price: 48, walkM: 1600, rating: 4.7, dine: true, deliver: false, reason: "料给得足，鸭血是新鲜的", emoji: "🍲", hue: 358, navLink: AMAP("川菜馆"), by: "laochi", tags: ["spicy"] },

  // ---- 粤菜与粥汤
  { key: "x10", dish: "蟹肉砂锅粥", shop: "潮汕砂锅粥", cat: "粥汤", price: 55, walkM: 1400, rating: 4.7, dine: true, deliver: false, reason: "现煮的，两个人点小份就够", emoji: "🍲", hue: 150, navLink: AMAP("砂锅粥"), by: "laochi", tags: ["light"] },
  { key: "x11", dish: "阿婆牛杂", shop: "阿婆牛杂老店", cat: "粥汤", price: 26, walkM: 400, rating: 4.8, dine: true, deliver: false, reason: "走过去四百米，排队约十分钟", emoji: "🍢", hue: 30, navLink: AMAP("牛杂"), by: "laochi", tags: ["near"] },
  { key: "x12", dish: "白切鸡饭", shop: "粤味小厨", cat: "粤菜", price: 32, walkM: 1100, eta: 26, rating: 4.6, dine: true, deliver: true, reason: "不重口，姜葱是现剁的", emoji: "🍗", hue: 45, orderPlatform: "饿了么", orderLink: ELE, navLink: AMAP("粤菜"), by: "waimai", tags: ["light"] },
  { key: "x25", dish: "干炒牛河", shop: "顺德小炒", cat: "粤菜", price: 34, walkM: 1300, eta: 25, rating: 4.7, dine: true, deliver: true, reason: "镬气够，油不多", emoji: "🍜", hue: 42, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("粤菜小炒"), by: "laochi", tags: [] },

  // ---- 轻食
  { key: "x13", dish: "鸡胸藜麦碗", shop: "轻食碗", cat: "轻食", price: 32, walkM: 1500, eta: 26, rating: 4.4, dine: false, deliver: true, reason: "你说在减脂，先按这个口径推", emoji: "🥗", hue: 120, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("轻食"), by: "waimai", tags: ["light"] },
  { key: "x26", dish: "溏心蛋鸡胸沙拉", shop: "青碗沙拉", cat: "轻食", price: 28, walkM: 1000, eta: 22, rating: 4.6, dine: true, deliver: true, reason: "酱另装，热量标得清楚", emoji: "🥙", hue: 110, orderPlatform: "饿了么", orderLink: ELE, navLink: AMAP("沙拉"), by: "waimai", tags: ["light"] },

  // ---- 烧烤
  { key: "x17", dish: "炭火腰子拼盘", shop: "老式烤串", cat: "烧烤", price: 80, walkM: 2600, rating: 4.6, dine: true, deliver: false, reason: "炭是真炭，别穿好衣服去", emoji: "🍢", hue: 18, navLink: AMAP("烧烤"), by: "laochi", tags: ["spicy"] },
  { key: "x18", dish: "烤鸡翅套餐", shop: "夜市烤翅", cat: "烧烤", price: 34, walkM: 1800, eta: 32, rating: 4.2, dine: true, deliver: true, reason: "深夜还开着的少数几家", emoji: "🍗", hue: 25, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("烤翅"), by: "waimai", tags: [] },
  { key: "x27", dish: "生蚝烤串组合", shop: "海边小烤", cat: "烧烤", price: 58, walkM: 1500, eta: 38, rating: 4.6, dine: true, deliver: true, reason: "生蚝当天到，烤的比蒸的香", emoji: "🦪", hue: 22, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("烧烤生蚝"), by: "laochi", tags: [] },

  // ---- 甜品
  { key: "x19", dish: "杨枝甘露", shop: "港记甜品", cat: "甜品", price: 20, walkM: 800, eta: 22, rating: 4.6, dine: true, deliver: true, reason: "下午垫一口，不影响晚饭", emoji: "🥭", hue: 40, orderPlatform: "饿了么", orderLink: ELE, navLink: AMAP("甜品"), by: "waimai", tags: ["light"] },
  { key: "x20", dish: "红豆双皮奶", shop: "顺德甜品铺", cat: "甜品", price: 16, walkM: 1000, rating: 4.7, dine: true, deliver: false, reason: "现做的，凉了就不好吃", emoji: "🍮", hue: 30, navLink: AMAP("双皮奶"), by: "laochi", tags: ["cheap"] },
  { key: "x28", dish: "芋泥麻薯厚吐司", shop: "小满烘焙", cat: "甜品", price: 22, walkM: 650, eta: 20, rating: 4.7, dine: true, deliver: true, reason: "下午三点出炉，那会儿去最好", emoji: "🍞", hue: 48, orderPlatform: "美团外卖", orderLink: MT, navLink: AMAP("烘焙"), by: "waimai", tags: ["light"] },
  { key: "x29", dish: "黑糖珍珠鲜奶", shop: "茶山", cat: "甜品", price: 18, walkM: 450, eta: 18, rating: 4.5, dine: true, deliver: true, reason: "半糖就够甜，别点全糖", emoji: "🧋", hue: 32, orderPlatform: "饿了么", orderLink: ELE, navLink: AMAP("奶茶"), by: "waimai", tags: ["near"] },
];

export const DISH_CATS = ["全部", "早餐", "快餐", "面食", "川湘", "粤菜", "粥汤", "轻食", "烧烤", "甜品"];

export const findDish = (key: string) => DISHES.find((d) => d.key === key);

/* ============================================================
   周末去哪的内容池。跟吃饭是完全不同的决策维度：
   人关心的是室内还是户外、要花多久、几点最舒服、要不要门票，
   而不是配送时间和人均。
   ============================================================ */

export type Outing = {
  key: string;
  /** 活动名 */
  name: string;
  /** 场地或地点 */
  place: string;
  /** 类型：展览 / 演出 / 电影 / 户外 / 运动 / 周边游 */
  cat: string;
  /** 门票，0 表示免费 */
  price: number;
  /** 距离（米），用于「5公里内」 */
  distM: number;
  /** 单程交通说明 */
  travel: string;
  /** 需要花的时间（分钟），用于「半天以内」 */
  dur: number;
  /** 最舒服的时段 */
  best: string;
  /** 是否需要早起（早于 9 点出门） */
  early: boolean;
  indoor: boolean;
  /** 需要提前订票 */
  booking: boolean;
  rating: number;
  reason: string;
  emoji: string;
  hue: number;
  platform: string;
  deeplink: string;
  by: string;
};

export const OUTINGS: Outing[] = [
  // ---- 展览
  { key: "o1", name: "缓慢的光 · 当代摄影展", place: "798 一带", cat: "展览", price: 68, distM: 8000, travel: "地铁 40 分钟", dur: 90, best: "刚开馆那一小时人最少", early: false, indoor: true, booking: true, rating: 4.8, reason: "这个展不吵，适合你话说太多的那一周", emoji: "🖼", hue: 285, platform: "大麦", deeplink: "https://search.damai.cn/search.htm?keyword=摄影展", by: "jingshen" },
  { key: "o2", name: "宋代器物特展", place: "国家博物馆", cat: "展览", price: 0, distM: 12000, travel: "地铁 50 分钟", dur: 150, best: "周六下午三点后人少", early: false, indoor: true, booking: true, rating: 4.9, reason: "免票但要提前一天约，别到门口才想起来", emoji: "🏺", hue: 275, platform: "官方预约", deeplink: "https://www.chnmuseum.cn/", by: "jingshen" },
  { key: "o3", name: "独立书店的小型影像展", place: "五道口", cat: "展览", price: 0, distM: 1800, travel: "步行 22 分钟", dur: 60, best: "傍晚顺路过去", early: false, indoor: true, booking: false, rating: 4.5, reason: "就在你常走那条街上，一小时能逛完", emoji: "📷", hue: 290, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=书店", by: "jingshen" },

  // ---- 演出
  { key: "o4", name: "小剧场话剧 · 两个人的房间", place: "鼓楼一带", cat: "演出", price: 180, distM: 9000, travel: "地铁 45 分钟", dur: 100, best: "周六 19:30 开场", early: false, indoor: true, booking: true, rating: 4.7, reason: "两个演员撑满全场，前八排值回票价", emoji: "🎭", hue: 320, platform: "大麦", deeplink: "https://search.damai.cn/search.htm?keyword=话剧", by: "jingshen" },
  { key: "o5", name: "livehouse 民谣专场", place: "鼓楼", cat: "演出", price: 120, distM: 9500, travel: "地铁 48 分钟", dur: 150, best: "20:00 开场，散场十一点", early: false, indoor: true, booking: true, rating: 4.6, reason: "站票也无所谓，场地小，哪儿都听得清", emoji: "🎸", hue: 310, platform: "大麦", deeplink: "https://search.damai.cn/search.htm?keyword=livehouse", by: "jingshen" },
  { key: "o6", name: "露天电影放映", place: "朝阳公园", cat: "电影", price: 40, distM: 7000, travel: "地铁 35 分钟", dur: 130, best: "日落之后开始", early: false, indoor: false, booking: true, rating: 4.4, reason: "带张毯子就行，天凉了记得穿外套", emoji: "🎬", hue: 250, platform: "猫眼", deeplink: "https://www.maoyan.com/", by: "jingshen" },
  { key: "o7", name: "老片重映 · 胶片场", place: "海淀", cat: "电影", price: 45, distM: 2500, travel: "地铁 12 分钟", dur: 134, best: "周日 14:00，起晚了也赶得上", early: false, indoor: true, booking: true, rating: 4.7, reason: "你说过周末不爱早起，下午场刚好", emoji: "🎞", hue: 255, platform: "猫眼", deeplink: "https://www.maoyan.com/", by: "jingshen" },

  // ---- 户外与运动
  { key: "o8", name: "奥森五公里慢跑", place: "奥林匹克森林公园", cat: "户外", price: 0, distM: 4500, travel: "地铁 20 分钟", dur: 60, best: "九点前人少，十点后晒", early: true, indoor: false, booking: false, rating: 4.7, reason: "上次那个五公里你答应了没去（这次别再答应）", emoji: "🏃", hue: 140, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=奥林匹克森林公园", by: "majiaxian" },
  { key: "o9", name: "西山徒步入门线", place: "西山", cat: "户外", price: 0, distM: 18000, travel: "自驾 50 分钟", dur: 240, best: "八点出发，中午前下山", early: true, indoor: false, booking: false, rating: 4.6, reason: "全程台阶不多，第一次爬别选香山", emoji: "⛰", hue: 130, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=西山", by: "majiaxian" },
  { key: "o10", name: "室内攀岩抱石入门", place: "北四环", cat: "运动", price: 88, distM: 3200, travel: "地铁 18 分钟", dur: 90, best: "下午场人少，教练有空盯你", early: false, indoor: true, booking: false, rating: 4.7, reason: "不用绳，第一次别爬顶，手会疼两天", emoji: "🧗", hue: 100, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=攀岩馆", by: "majiaxian" },
  { key: "o11", name: "普拉提体验课", place: "五道口一带", cat: "运动", price: 49, distM: 1600, travel: "步行 20 分钟", dur: 60, best: "随时，需提前一天约", early: false, indoor: true, booking: true, rating: 4.5, reason: "下雨或者不想跑的时候用这个替", emoji: "🧘", hue: 170, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=普拉提", by: "majiaxian" },
  { key: "o12", name: "城市骑行 20 公里", place: "沿河绿道", cat: "户外", price: 0, distM: 2000, travel: "步行 10 分钟到起点", dur: 120, best: "傍晚风小，别中午骑", early: false, indoor: false, booking: false, rating: 4.6, reason: "全程没什么坡，共享单车也能骑完", emoji: "🚲", hue: 145, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=绿道", by: "majiaxian" },

  // ---- 周边游
  { key: "o13", name: "古北水镇 · 傍晚到夜场", place: "密云", cat: "周边游", price: 140, distM: 90000, travel: "自驾 1.5 小时", dur: 300, best: "下午四点后进园，人少一半", early: false, indoor: false, booking: true, rating: 4.6, reason: "灯亮起来才是重点，回程别晚于十点", emoji: "🏞", hue: 190, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=古北水镇", by: "lvyou" },
  { key: "o14", name: "百花山一日往返", place: "门头沟", cat: "周边游", price: 60, distM: 110000, travel: "自驾 2 小时", dur: 480, best: "七点半前出发能避开堵", early: true, indoor: false, booking: false, rating: 4.7, reason: "这个季节山上二十度出头，晚两周草就黄了", emoji: "⛰", hue: 205, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=百花山", by: "lvyou" },
  { key: "o15", name: "潭柘寺半日", place: "门头沟", cat: "周边游", price: 55, distM: 45000, travel: "自驾 1 小时", dur: 240, best: "上午去，下午回来还能睡个午觉", early: false, indoor: false, booking: false, rating: 4.5, reason: "银杏还没黄透，人比香山少得多", emoji: "🍃", hue: 195, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=潭柘寺", by: "lvyou" },
  { key: "o16", name: "运河边露营地", place: "通州", cat: "周边游", price: 98, distM: 30000, travel: "自驾 45 分钟", dur: 300, best: "下午到，天黑前搭好", early: false, indoor: false, booking: true, rating: 4.4, reason: "装备可以租，不用自己扛", emoji: "⛺", hue: 185, platform: "高德地图", deeplink: "https://uri.amap.com/search?keyword=露营", by: "lvyou" },
];

export const OUTING_CATS = ["全部", "展览", "演出", "电影", "户外", "运动", "周边游"];

export const findOuting = (key: string) => OUTINGS.find((o) => o.key === key);
