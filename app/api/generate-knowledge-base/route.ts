import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set in environment variables" },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Generate knowledge base content (prompt/instructions) for the chatbot using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates comprehensive knowledge base content and instructions for chatbots. Create detailed, well-structured content that will serve as the primary instructions and knowledge base for a chatbot. Include business context, FAQs, product/service information, policies, procedures, and helpful responses. You can use markdown formatting for structure, but DO NOT include title headers like '# Customer Service Agent Chatbot Knowledge Base' or welcome sections like '## Welcome to our Customer Service Chatbot!'. Start directly with the actual content, facts, FAQs, and instructions. This content will be used as the main prompt/instruction set for the chatbot to answer user questions.",
        },
        {
          role: "user",
          content: `Generate comprehensive knowledge base content and instructions for a chatbot based on this request: ${prompt}. Do not include title headers or welcome messages. Start directly with the content, facts, FAQs, and instructions.`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    let content = completion.choices[0]?.message?.content?.trim() || 
      "Knowledge base content could not be generated. Please try again.";
    
    // Remove title headers and welcome messages, but keep markdown formatting
    const lines = content.split('\n');
    const cleanedLines = lines
      .filter((line, index) => {
        const trimmed = line.trim();
        // Remove main title headers (first level # with common title patterns)
        if (trimmed.match(/^#\s+(Customer Service|Knowledge Base|Chatbot|Welcome)/i)) return false;
        // Remove welcome sections
        if (trimmed.match(/^##\s+Welcome/i)) return false;
        // Remove standalone title lines that are just titles (short lines with title patterns)
        if (trimmed.match(/^(Customer Service Agent Chatbot Knowledge Base|Welcome to our Customer Service Chatbot!?)$/i)) return false;
        // Remove empty lines at the start
        if (index === 0 && !trimmed) return false;
        return true;
      });
    
    content = cleanedLines.join('\n').trim();

    // Remove leading empty lines
    content = content.replace(/^\n+/, '');

    // Final check - if still empty, return error
    if (!content || content.length < 10) {
      return NextResponse.json(
        { error: 'Generated content was invalid. Please try again with a different description.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

