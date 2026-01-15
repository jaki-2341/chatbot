import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { knowledgeBase } = body;

    if (!knowledgeBase || knowledgeBase.trim().length === 0) {
      return NextResponse.json(
        { error: 'Knowledge base content is required. Please upload files and generate the knowledge base first.' },
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

    // Generate suggested questions based on knowledge base content
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that generates relevant, user-friendly suggested questions for a chatbot interface based on knowledge base content.

Your task is to analyze the provided knowledge base content and generate exactly 4 suggested questions that:
1. Are relevant to the knowledge base content
2. Are phrased as natural, conversational questions users would ask
3. Cover different aspects or topics from the knowledge base
4. Are concise (ideally under 10 words each)
5. Would help users discover key information or features

Return a JSON object with a "questions" property containing an array of exactly 4 question strings. Format: {"questions": ["Question 1", "Question 2", "Question 3", "Question 4"]}`,
        },
        {
          role: "user",
          content: `Based on the following knowledge base content, generate exactly 4 suggested questions that users might ask:

${knowledgeBase}

Return a JSON object with a "questions" property containing an array of exactly 4 questions.`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    let responseContent = completion.choices[0]?.message?.content?.trim() || '';
    
    // Parse the JSON response
    let questions: string[] = [];
    try {
      const parsed = JSON.parse(responseContent);
      // Handle different possible response formats
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else if (parsed.suggestedQuestions && Array.isArray(parsed.suggestedQuestions)) {
        questions = parsed.suggestedQuestions;
      } else {
        // Try to find any array in the response
        const arrayKeys = Object.keys(parsed).filter(key => Array.isArray(parsed[key]));
        if (arrayKeys.length > 0) {
          questions = parsed[arrayKeys[0]];
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract questions from text
      // Look for array-like patterns
      const arrayMatch = responseContent.match(/\[(.*?)\]/s);
      if (arrayMatch) {
        try {
          questions = JSON.parse(arrayMatch[0]);
        } catch {
          // Fallback: split by common delimiters
          const lines = responseContent.split('\n').filter(line => line.trim().length > 0);
          questions = lines.slice(0, 4).map(line => line.replace(/^[\d.\-\s]*["']?|["']?$/g, '').trim()).filter(q => q.length > 0);
        }
      }
    }

    // Ensure we have exactly 4 questions, pad or trim as needed
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Could not generate questions. Please try again.' },
        { status: 500 }
      );
    }

    // Trim to 4 questions and ensure they're strings
    questions = questions.slice(0, 4).map(q => String(q).trim()).filter(q => q.length > 0);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Generated questions were invalid. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
