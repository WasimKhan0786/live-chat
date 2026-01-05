import { NextResponse } from "next/server";
import { sendSlackNotification } from "@/lib/slack";

export async function POST(request: Request) {
  try {
    const { roomId, action, user } = await request.json();
    
    let message = "";
    const userName = user || "Anonymous";

    if (action === "create") {
      message = `🚀 *New Room Created!* \n👤 User: *${userName}*\n🆔 Room ID: \`${roomId}\``;
    } else if (action === "join") {
       message = `👋 *User Joined!* \n👤 User: *${userName}*\n🏠 Room: \`${roomId}\``;
    }

    if (message) {
        // Send asynchronously without blocking response
        sendSlackNotification(message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
