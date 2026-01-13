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
          content: `You are a helpful assistant that generates comprehensive, structured knowledge base content and instructions for chatbots. 

You MUST generate content following this EXACT structure and format:

# [Assistant Type] Prompt

## Identity & Purpose
Define the assistant's role, primary purpose, and what it's designed to accomplish.

## Voice & Persona
### Personality
- List personality traits and characteristics
- Describe the tone and approach

### Speech Characteristics
- Describe how the assistant should communicate
- Include language style, formality level, etc.

## Conversation Flow
### Introduction
Provide the opening greeting and how to handle initial interactions.

### [Relevant Flow Sections]
Break down the conversation flow into logical steps (e.g., Issue Identification, Troubleshooting, Resolution, Closing, etc.)

## Response Guidelines
- List specific guidelines for how to respond
- Include response length, question format, confirmation practices
- Add any communication best practices

## Scenario Handling
### [Common Scenarios]
Provide specific guidance for handling different scenarios (e.g., Technical Issues, Frustrated Customers, Complex Issues, Feature Requests, etc.)

## Knowledge Base
### [Relevant Categories]
Organize knowledge into categories (e.g., Product Information, Common Solutions, Account Management, Policies, etc.)
Include specific facts, FAQs, and information the assistant should know.

## Response Refinement
Provide techniques for explaining concepts, handling step-by-step instructions, and refining responses.

End with a brief reminder statement about the assistant's ultimate goal.

Use markdown formatting with proper heading levels (# for main title, ## for major sections, ### for subsections). Be comprehensive and detailed.`,
        },
        {
          role: "user",
          content: `Generate comprehensive knowledge base content and instructions for a chatbot based on this request: ${prompt}. 

Follow the structured format exactly as specified. Include all required sections: Identity & Purpose, Voice & Persona, Conversation Flow, Response Guidelines, Scenario Handling, Knowledge Base, and Response Refinement. Make it detailed and actionable.`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    let content = completion.choices[0]?.message?.content?.trim() || 
      "Knowledge base content could not be generated. Please try again.";
    
    // Ensure the content follows the structured format
    // Check if it starts with a main title (#)
    if (!content.startsWith('#')) {
      // If not, try to find the first # heading and use everything from there
      const firstHeadingIndex = content.indexOf('#');
      if (firstHeadingIndex !== -1) {
        content = content.substring(firstHeadingIndex);
      }
    }
    
    // Clean up any leading/trailing whitespace
    content = content.trim();

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

