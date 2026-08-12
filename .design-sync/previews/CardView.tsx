import React from "react";
import { CardView } from "meemate";

const deliveryCard = {
  id: "c1",
  kind: "delivery",
  title: "黄焖鸡米饭",
  subtitle: "杨铭宇 · 万柳店",
  emoji: "🍗",
  price: "¥26",
  eta: "28分钟",
  distance: "步行 1.2km",
  reason: "你上周说想吃鸡",
  meta: {},
};

const restaurantCard = {
  id: "c2",
  kind: "restaurant",
  title: "老北京炸酱面",
  subtitle: "海淀黄庄店 · 开了二十年",
  emoji: "🍜",
  price: "¥38",
  distance: "步行 800m",
  reason: "你说过喜欢面食",
  meta: {},
};

const diaryCard = {
  id: "c3",
  kind: "diary",
  title: "今日小记",
  subtitle: "8月12日",
  body: [
    "中午和同事去了楼下新开的面馆，点了担担面，辣度刚好。",
    "下午开完会有点累，买了杯燕麦拿铁续命。",
    "晚上看了半集纪录片就困了，明天想早起跑步。",
  ],
  meta: {},
};

const morningCard = {
  id: "c4",
  kind: "morning",
  title: "早安呀",
  subtitle: "8月12日 周二",
  body: [
    "今天多云转晴，28到34度，记得做好防晒喵",
    "你昨天说想吃鱼，老吃家已经在找了",
    "周末行程还差一个下午茶的位置",
  ],
  meta: {},
};

export function DeliveryCard() {
  return (
    <div style={{ width: 280 }}>
      <CardView
        card={deliveryCard}
        agentId="waimai"
        conversationId="g-eat"
        onToast={() => {}}
      />
    </div>
  );
}

export function RestaurantCard() {
  return (
    <div style={{ width: 280 }}>
      <CardView
        card={restaurantCard}
        agentId="laochi"
        conversationId="g-eat"
        onToast={() => {}}
      />
    </div>
  );
}

export function DiaryCard() {
  return (
    <div style={{ width: 280 }}>
      <CardView
        card={diaryCard}
        agentId="mimi"
        conversationId="mimi"
        onToast={() => {}}
      />
    </div>
  );
}

export function MorningCard() {
  return (
    <div style={{ width: 280 }}>
      <CardView
        card={morningCard}
        agentId="mimi"
        conversationId="mimi"
        onToast={() => {}}
      />
    </div>
  );
}

export function SmallCard() {
  return (
    <div style={{ width: 220 }}>
      <CardView
        card={deliveryCard}
        agentId="waimai"
        conversationId="g-eat"
        small
        onToast={() => {}}
      />
    </div>
  );
}
