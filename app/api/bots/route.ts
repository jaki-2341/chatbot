import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { botToDocument, documentToBot, BotDocument } from '@/app/models/Bot';
import { Bot } from '@/app/types/bot';

export const dynamic = 'force-dynamic';

// GET - List all bots
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const botsCollection = db.collection('bots');
    
    const bots = await botsCollection.find({}).sort({ createdAt: -1 }).toArray();
    
    return NextResponse.json({
      bots: bots.map(doc => documentToBot(doc as BotDocument)),
    });
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bots' },
      { status: 500 }
    );
  }
}

// POST - Create new bot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bot: Bot = body;

    if (!bot.id || !bot.name || !bot.agentName) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, agentName' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const botsCollection = db.collection('bots');

    // Check if bot with this ID already exists
    const existing = await botsCollection.findOne({ id: bot.id });
    if (existing) {
      return NextResponse.json(
        { error: 'Bot with this ID already exists' },
        { status: 409 }
      );
    }

    const botDoc = botToDocument({
      ...bot,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await botsCollection.insertOne(botDoc);

    return NextResponse.json(
      { bot: documentToBot(botDoc as BotDocument) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating bot:', error);
    return NextResponse.json(
      { error: 'Failed to create bot' },
      { status: 500 }
    );
  }
}

