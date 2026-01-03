import { Realtime, InferRealtimeEvents } from "@upstash/realtime";
import { redis } from "./redis";
import z from "zod/v4";
const message = z.object({
  id: z.string(),
  sender: z.string(),
  text: z.string(),
  timestamp: z.number(),
  roomid: z.string(),
  token: z.string(),
});
const destroy = z.object({
  isDestroyed: z.literal(true),
});
const schema = {
  chat: {
    message,
    destroy,
  },
  notification: {
    alert: z.string(),
  },
};

export const realtime = new Realtime({ schema, redis });
export type Message = z.infer<typeof message>;
export type Destroy = z.infer<typeof destroy>;
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
