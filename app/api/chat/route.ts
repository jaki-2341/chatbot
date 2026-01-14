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

// Normalize messages to ensure consistent format from both live-preview and loader.js
function normalizeMessages(messages: any[]): Message[] {
  if (!Array.isArray(messages)) {
    return [];
  }
  
  const seen = new Set<string>();
  
  return messages
    .filter((msg) => {
      // Filter out null/undefined messages
      if (!msg || !msg.role) {
        return false;
      }
      // Filter out hidden info messages (they're sent but shouldn't be in conversation history)
      if (msg.id && typeof msg.id === 'string' && msg.id.startsWith('hidden-info-')) {
        return false;
      }
      // Filter out empty messages (both user and assistant)
      if (!msg.content || typeof msg.content !== 'string' || msg.content.trim() === '') {
        return false;
      }
      // Filter out info collection bubbles (they're UI-only)
      if (msg.id && typeof msg.id === 'string' && msg.id.startsWith('info-collection-')) {
        return false;
      }
      // Ensure valid role
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        return false;
      }
      
      // Deduplicate: create a key from role and content to detect exact duplicates
      const contentKey = `${msg.role}:${msg.content.trim().substring(0, 100)}`;
      if (seen.has(contentKey)) {
        console.log(`[Chat API] Filtered out duplicate message: ${contentKey.substring(0, 50)}...`);
        return false;
      }
      seen.add(contentKey);
      
      return true;
    })
    .map((msg) => {
      // Clean content: remove any HTML tags that might have been accidentally included
      let cleanContent = msg.content.trim();
      // Remove HTML tags if present (shouldn't happen, but defensive)
      if (cleanContent.includes('<') && cleanContent.includes('>')) {
        cleanContent = cleanContent.replace(/<[^>]*>/g, '').trim();
      }
      
      return {
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: cleanContent,
      };
    }) as Message[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      messages, 
      botId, 
      knowledgeBase, 
      agentName,
      role,
      collectInfoEnabled,
      collectName,
      collectEmail,
      collectPhone,
      hasRequestedInfo
    }: { 
      messages: any[]; 
      botId?: string; 
      knowledgeBase?: string; 
      agentName?: string;
      role?: string;
      collectInfoEnabled?: boolean;
      collectName?: boolean;
      collectEmail?: boolean;
      collectPhone?: boolean;
      hasRequestedInfo?: boolean;
    } = body;
    
    // Normalize messages to ensure consistent format
    const normalizedMessages = normalizeMessages(messages);
    
    if (normalizedMessages.length === 0) {
      return NextResponse.json(
        {
          error: "No valid messages found in request",
        },
        { status: 400, headers: corsHeaders },
      );
    }
    
    const lastMessage = normalizedMessages[normalizedMessages.length - 1];
    if (lastMessage.role !== "user") {
      return NextResponse.json(
        {
          error: "The last message must be from the user",
        },
        { status: 400, headers: corsHeaders },
      );
    }
    
    // Get conversation history (all messages except the last one)
    const conversationHistory = normalizedMessages.slice(0, -1);

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
    // If conversation history has no user messages, this is the first user message
    const userMessagesInHistory = conversationHistory.filter(m => m.role === 'user');
    const isFirstUserMessage = userMessagesInHistory.length === 0 && lastMessage.role === 'user';
    
    // Only ask for info if it's the first message AND info hasn't been requested before (localStorage check)
    const shouldAskForInfo = isFirstUserMessage && !hasRequestedInfo;

    // Log for debugging RAG issues - detailed message inspection
    console.log(`[Chat API] ========== REQUEST DEBUG ==========`);
    console.log(`[Chat API] botId: ${botId}`);
    console.log(`[Chat API] knowledgeBase length: ${knowledgeBase?.length || 0}`);
    console.log(`[Chat API] Raw messages received: ${messages.length}`);
    console.log(`[Chat API] Normalized messages: ${normalizedMessages.length}`);
    console.log(`[Chat API] Conversation history: ${conversationHistory.length} messages`);
    console.log(`[Chat API] Last message (user): "${lastMessage.content.substring(0, 150)}..."`);
    
    if (conversationHistory.length > 0) {
      console.log(`[Chat API] Conversation history details:`);
      conversationHistory.forEach((m, i) => {
        console.log(`[Chat API]   [${i}] ${m.role}: "${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}" (${m.content.length} chars)`);
      });
    } else {
      console.log(`[Chat API] No conversation history - this is the first message`);
    }
    console.log(`[Chat API] ====================================`);

    // createChatEngine now handles system prompt via contextSystemPrompt
    const chatEngine = await createChatEngine(
      llm, 
      botId, 
      knowledgeBase, 
      agentName,
      role,
      collectInfoEnabled,
      collectName,
      collectEmail,
      collectPhone,
      shouldAskForInfo,
      hasRequestedInfo
    );

    // Use normalized conversation history (system prompt is handled in contextSystemPrompt)
    // Convert to the format expected by ContextChatEngine
    const enhancedMessages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    console.log(`[Chat API] Calling chatEngine.chat with query: "${lastMessage.content.substring(0, 100)}..." and ${enhancedMessages.length} history messages`);

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
