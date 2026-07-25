"use client";

import { useEffect, useRef } from "react";

type Message = { id: string; role: string; content: string };

export function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-sm text-neutral-600">
        No messages yet — generate the first version to start the conversation.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
      <ul className="space-y-2">
        {messages.map((message) => (
          <li
            key={message.id}
            className={`rounded-lg border px-4 py-2 text-sm ${
              message.role === "user"
                ? "border-neutral-700 bg-neutral-900 text-neutral-200"
                : "border-neutral-800 bg-neutral-950 text-neutral-300"
            }`}
          >
            <p className="mb-0.5 text-xs uppercase tracking-wide text-neutral-500">
              {message.role === "user" ? "Prompt" : "Kondo"}
            </p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </li>
        ))}
      </ul>
      <div ref={bottomRef} />
    </div>
  );
}
