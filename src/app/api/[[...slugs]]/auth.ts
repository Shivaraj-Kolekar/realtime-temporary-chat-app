import { redis } from "@/lib/redis";
import Elysia from "elysia";

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const authMiddleware = new Elysia({
  name: "auth",
})
  .error({ AuthError })
  .onError(({ code, set }) => {
    if (code === "AuthError") {
      set.status = 401;
      return { error: "Unauthorized" };
    }
  })
  .derive({ as: "scoped" }, async ({ query, cookie }) => {
    const roomid = query.roomid;
    const token = cookie["x-auth-token"].value as string | undefined;
    if (!roomid || !token) {
      throw new AuthError("Missing room id or token");
    }
    const connected = await redis.hget<string[]>(`meta:${roomid}`, "connected");
    if (!connected?.includes(token)) {
      throw new AuthError("Invalid token");
    }
    return { auth: { roomid, token, connected } };
  });
