"use client";

import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { format } from "date-fns/fp";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
const formatTimeRemaining = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
const Page = () => {
  const params = useParams();
  const { username } = useUsername();
  const router = useRouter();
  const roomid = params.id as string;
  const [copyState, setCopyState] = useState("Copy");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [input, setInput] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomid],
    queryFn: async () => {
      const res = await client.rooms.ttl.get({
        query: { roomid },
      });
      return res.data;
    },
  });
  useEffect(() => {
    if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl);
    else {
      setTimeRemaining(100);
    }
  }, [ttlData]);
  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) {
      return;
    }
    if (timeRemaining === 0) {
      router.push("/?destroyed");
    }
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, router]);
  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopyState("Copied");
    setTimeout(() => setCopyState("Copy"), 2000);
  };

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomid], // this is for caching the room messages
    queryFn: async () => {
      const res = await client.messages.get({
        query: { roomid },
      });
      return res.data;
    },
  });

  const { mutate: SendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post(
        {
          sender: username,
          text,
        },
        { query: { roomid } }
      );
    },
  });
  const { mutate: DestroyRoom } = useMutation({
    mutationFn: async () => {
      await client.rooms.delete(null, { query: { roomid } });
    },
  });
  useRealtime({
    channels: [roomid],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") {
        refetch();
      }
      if (event === "chat.destroy") {
        router.push("/?destroyed=true");
      }
    },
  });
  return (
    <>
      <main className="flex flex-col min-h-screen overflow-hidden ">
        <header className="border-b border-zinc-800 flex justify-between items-center p-4">
          <div className="flex  items-center gap-4">
            <span className="text-xs text-zinc-500 uppercase">
              Room id :{" "}
              <span className="text-green-500 font-bold">{roomid}</span>
              <button
                onClick={() => copyLink()}
                className="text-[10px] bg-zinc-800  hover:bg-zinc-700 px-2 py-1 ml-4 rounded text-zinc-400 hover:text-zinc-200"
              >
                {copyState}
              </button>
            </span>
            <div className="h-8 w-px bg-zinc-800"></div>

            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 uppercase">
                Self Destruct
              </span>
              <span
                className={`text-sm font-bold flex items-center gap-2 ${
                  timeRemaining !== null && timeRemaining < 60
                    ? "text-red-500"
                    : "text-yellow-500"
                }`}
              >
                {timeRemaining !== null
                  ? formatTimeRemaining(timeRemaining)
                  : "--:--"}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              DestroyRoom();
            }}
            className="ml-4 text-xs bg-zinc-800 hover:bg-red-500 px-2 py-2 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-45 "
          >
            Destroy Now
          </button>
        </header>
        <div className="flex-1 max-h-[50%] overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <h1>Welcome to chat room</h1>
          <p>Your room id : {roomid}</p>
          <div className="flex h-full justify-center justify-items-center items-center">
            {messages?.messages.length === 0 && (
              <div className="text-center bg-zinc-700 p-6 border-s-stone-600 rounded max-w-[50%]">
                <p>No messages yet in the chat , start the conversation </p>
              </div>
            )}
          </div>
          <>
            {messages?.messages.map((msg) => (
              <div
                className="flex my-3 p-3 flex-col gap-1 bg-zinc-800 min-w-[20%] w-40 max-w-[50%] rounded border-zinc-500flex-col "
                key={msg.id}
              >
                <p
                  className={`text-xs ${
                    msg.sender === username ? "text-green-500" : "text-blue-500"
                  }`}
                >
                  {msg.sender === username ? "You" : msg.sender}
                </p>
                <div className="text-lg text-white font-bold">{msg.text}</div>
                {/*<p className="mt-2 text-xs text-zinc-400">{msg.timestamp}</p>*/}
              </div>
            ))}
          </>
        </div>

        <div className="p-4  border-t border-y-zinc-800 bg-zinc-900/30">
          <div className="flex gap-4">
            <div className="flex-1 relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
                {">"}
              </span>
              <input
                autoFocus
                type="text"
                placeholder="Type message here.."
                value={input}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    //send the message to backend
                    SendMessage({ text: input });
                    inputRef.current?.focus();
                    setInput("");
                  }
                }}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 py-3 pl-8 pr-4 text-sm "
              ></input>
            </div>
            <button
              onClick={() => {
                SendMessage({ text: input });
                inputRef.current?.focus();
              }}
              disabled={!input.trim() || isPending}
              className="text-zinc-400 px-6 bg-zinc-800 font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Send {">"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
};
export default Page;
