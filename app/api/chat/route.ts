import { Message, StreamingTextResponse } from "ai";
import { OpenAI } from "llamaindex";
import { NextRequest, NextResponse } from "next/server";
import { createChatEngine } from "./engine";
import { LlamaIndexStream } from "./llamaindex-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS headers for widget access from external domains
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, botId, knowledgeBase, agentName }: { messages: Message[]; botId?: string; knowledgeBase?: string; agentName?: string } = body;
    const lastMessage = messages.pop();
    if (!messages || !lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        {
          error:
            "messages are required in the request body and the last message must be from the user",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set in environment variables" },
        { status: 500, headers: corsHeaders },
      );
    }

    const llm = new OpenAI({
      model: "gpt-3.5-turbo",
      apiKey: apiKey, // Explicitly set the API key
    });

    // createChatEngine now only indexes PDF files, not knowledge base
    // Knowledge base is passed as instructions separately
    const chatEngine = await createChatEngine(llm, botId, knowledgeBase, agentName);

    // Prepare messages with knowledge base as system instruction
    // Knowledge base is NOT indexed - it's used as instructions for the AI
    let enhancedMessages = [...messages];
    if (knowledgeBase && knowledgeBase.trim()) {
      // Prepend knowledge base as a system message
      let systemInstruction = knowledgeBase;
      if (agentName) {
        systemInstruction = `You are ${agentName}, a helpful customer support agent. ${knowledgeBase}`;
      }
      enhancedMessages = [
        { id: 'system-instruction', role: 'system' as const, content: systemInstruction },
        ...messages
      ];
    } else if (agentName) {
      // If no knowledge base but agent name exists, add agent context as system message
      enhancedMessages = [
        { id: 'system-instruction', role: 'system' as const, content: `You are ${agentName}, a helpful customer support agent.` },
        ...messages
      ];
    }

    const response = await chatEngine.chat(lastMessage.content, enhancedMessages, true);

    // Transform the response into a readable stream
    const stream = LlamaIndexStream(response);

    // Return a StreamingTextResponse with CORS headers
    return new StreamingTextResponse(stream, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("[LlamaIndex]", error);
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}
