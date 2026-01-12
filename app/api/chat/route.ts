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
    const { 
      messages, 
      botId, 
      knowledgeBase, 
      agentName,
      collectInfoEnabled,
      collectName,
      collectEmail,
      collectPhone,
      hasRequestedInfo
    }: { 
      messages: Message[]; 
      botId?: string; 
      knowledgeBase?: string; 
      agentName?: string;
      collectInfoEnabled?: boolean;
      collectName?: boolean;
      collectEmail?: boolean;
      collectPhone?: boolean;
      hasRequestedInfo?: boolean;
    } = body;
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

    // Check if this is the first user message
    // After pop(), if there are no user messages in the remaining array, this is the first user message
    const userMessages = messages.filter(m => m.role === 'user');
    const isFirstUserMessage = userMessages.length === 0 && lastMessage.role === 'user';
    
    // Only ask for info if it's the first message AND info hasn't been requested before (localStorage check)
    const shouldAskForInfo = isFirstUserMessage && !hasRequestedInfo;

    // createChatEngine now handles system prompt via contextSystemPrompt
    const chatEngine = await createChatEngine(
      llm, 
      botId, 
      knowledgeBase, 
      agentName,
      collectInfoEnabled,
      collectName,
      collectEmail,
      collectPhone,
      shouldAskForInfo,
      hasRequestedInfo
    );

    // Prepare messages (system prompt is handled in contextSystemPrompt)
    const enhancedMessages = [...messages];

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
