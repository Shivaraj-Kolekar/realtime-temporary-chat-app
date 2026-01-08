"use client";
import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
const Page = () => {
  return (
    <Suspense>
      <Home></Home>
    </Suspense>
  );
};
export default Page;
function Home() {
  const router = useRouter();
  const searchparams = useSearchParams();
  const wasDestroyed = searchparams.get("destroyed");
  const error = searchparams.get("error");
  const { username } = useUsername();
  const { mutate: CreateRoom } = useMutation({
    mutationFn: async () => {
      const res = await client.rooms.create.post();
      if (res.status === 200) {
        router.push(`/room/${res.data?.id}`);
      }
    },
  });
  return (
    <main className="min-h-screen flex p-4 justify-center items-center flex-col">
      <div className="w-full max-w-md space-y-8">
        {wasDestroyed && (
          <div className="bg-red-700/60 border border-red-400 px-6 py-8">
            <p>Room Destroyed</p>
          </div>
        )}
        {error === "room-not-found" && (
          <div className="bg-red-700/60 border border-red-400 px-6 py-8">
            <p>The room got expired or never existed</p>
          </div>
        )}
        {error === "room-is-full" && (
          <div className="bg-red-700/60 border border-red-400 px-6 py-8">
            <p>Room is Full</p>
          </div>
        )}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">
            {"> "}Welcome to Private Chat
          </h1>
          <p className="text-gray-500">
            A Private, self destructing chat room{" "}
          </p>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
          <div className="space-y-4">
            <div>
              <label className="text-zinc-600"> Your identity: </label>
            </div>
            <div className="p-2 bg-zinc-800/50 border-zinc-500 w-full flex flex-wrap">
              {username}
            </div>
            <button
              onClick={() => CreateRoom()}
              className="bg-white text-zinc-900 px-2 py-4 w-full"
            >
              Create Room
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
