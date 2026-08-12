"use client";

import { useParams } from "next/navigation";
import { Chat } from "@/components/Chat";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  return <Chat id={id} />;
}
