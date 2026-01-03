import { NextRequest, NextResponse } from "next/server";
import { redis } from "./lib/redis";
import { nanoid } from "nanoid/non-secure";

export const proxy = async (req: NextRequest) => {
  const pathname = req.nextUrl.pathname;
  const roomMatch = pathname.match(/^\/room\/([^/]+)$/); //regex to get the room id
  if (!roomMatch) return NextResponse.redirect(new URL("/", req.url)); //if room id not exist redirect to main page
  const id = roomMatch[1]; //store the room id
  const metadata = await redis.hgetall<{
    connected: string[];
    createdAt: number;
  }>(`meta:${id}`); // gets the redis db data
  if (!metadata) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
  } //redirect the user to main page if no room exist
  const existingtoken = req.cookies.get("x-auth-token")?.value;

  //this ensure that if user id is in connected array of redis he is allowed to enter room again without any operations and prevent other from joining
  if (existingtoken && metadata.connected.includes(existingtoken)) {
    return NextResponse.next();
  }

  //This tell only 2 users can be connected and prevent other from joining the room
  if (metadata.connected.length >= 4) {
    return NextResponse.redirect(new URL("/?error=room-is-full", req.url));
  }

  const response = NextResponse.next();
  const token = nanoid();
  response.cookies.set("x-auth-token", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  }); // store the user id in cookies

  //This add the user token in the redis to ensure he is in the room
  await redis.hset(`meta:${id}`, {
    connected: [...metadata.connected, token],
  });
  return response;
};

export const config = {
  matcher: "/room/:path*",
}; // config for the proxy/middleware to mention that it should work on /room/* path
