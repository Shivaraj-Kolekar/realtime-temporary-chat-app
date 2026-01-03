import { redis } from "@/lib/redis";
import Elysia from "elysia";

import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { Message, realtime } from "@/lib/realtime";
const ROOM_TTL_SECONDS = 60 * 10;

const rooms = new Elysia({ prefix: "/rooms" })
  .post("/create", async () => {
    const id = nanoid();
    await redis.hset(`meta:${id}`, {
      connected: [],
      createdAt: Date.now(),
    });

    await redis.expire(`meta:${id}`, ROOM_TTL_SECONDS);
    return { id };
  })
  .use(authMiddleware)
  .get("/ttl", async (auth) => {
    const ttl = await redis.ttl(`meta:${auth.auth.roomid}`);
    return { ttl: ttl > 0 ? ttl : 0 };
  })
  .delete(
    "/",
    async (auth) => {
      await realtime
        .channel(auth.auth.roomid)
        .emit("chat.destroy", { isDestroyed: true });
      await Promise.all([
        redis.del(`meta:${auth.auth.roomid}`),
        redis.del(auth.auth.roomid),
        redis.del(`messages:${auth.auth.roomid}`),
      ]);
    },

    { query: z.object({ roomid: z.string() }) }
  );

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { sender, text } = body;
      const { roomid } = auth;
      const roomExist = redis.exists(`meta:${roomid}`);
      if (!roomExist) {
        throw new Error("Room does not exist");
      }
      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomid,
        token: auth.token,
      };
      //Add  message to histroy
      await redis.rpush(`messages: ${roomid}`, {
        ...message,
        token: auth.token,
      });
      await realtime.channel(roomid).emit("chat.message", message);

      //Logic for room expiration
      const remainingTime = await redis.ttl(`meta:${roomid}`);
      await redis.expire(`history:${roomid}`, remainingTime);
      await redis.expire(roomid, remainingTime);
    },
    {
      query: z.object({ roomid: z.string() }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    }
  )
  .get(
    "/",
    async ({ auth }) => {
      const messages = await redis.lrange<Message>(
        `messages: ${auth.roomid}`,
        0,
        -1
      );
      return {
        messages: messages.map((m) => ({
          ...m,
          token: m.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    { query: z.object({ roomid: z.string() }) }
  );
const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages);

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;
export type App = typeof app;
