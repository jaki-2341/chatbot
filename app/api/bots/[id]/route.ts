import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { botToDocument, documentToBot, BotDocument } from '@/app/models/Bot';
import { Bot } from '@/app/types/bot';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const STORAGE_DIR = '/tmp/data';
const STORAGE_CACHE_DIR = '/tmp/cache';

// GET - Get single bot by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDatabase();
    const botsCollection = db.collection('bots');

    const bot = await botsCollection.findOne({ id });

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ bot: documentToBot(bot as BotDocument) });
  } catch (error) {
    console.error('Error fetching bot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bot' },
      { status: 500 }
    );
  }
}

// PUT - Update bot
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const updates: Partial<Bot> = body;

    const db = await getDatabase();
    const botsCollection = db.collection('bots');

    // Check if bot exists
    const existing = await botsCollection.findOne({ id });
    if (!existing) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Merge updates with existing bot data to preserve all fields
    const existingBot = documentToBot(existing as BotDocument);
    const mergedBot = { ...existingBot, ...updates };

    // Prepare update document
    const updateDoc: any = {
      ...botToDocument(mergedBot as Bot),
      updatedAt: new Date(),
    };
    delete updateDoc._id; // Don't update _id
    delete updateDoc.id; // Don't update id
    delete updateDoc.createdAt; // Don't update createdAt

    await botsCollection.updateOne(
      { id },
      { $set: updateDoc }
    );

    const updated = await botsCollection.findOne({ id });

    return NextResponse.json({ bot: documentToBot(updated as BotDocument) });
  } catch (error) {
    console.error('Error updating bot:', error);
    return NextResponse.json(
      { error: 'Failed to update bot' },
      { status: 500 }
    );
  }
}

// DELETE - Delete bot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDatabase();
    const botsCollection = db.collection('bots');

    const result = await botsCollection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Delete bot's data and cache directories
    const botDataDir = path.join(STORAGE_DIR, id);
    const botCacheDir = path.join(STORAGE_CACHE_DIR, id);

    try {
      // Delete data directory (uploaded files)
      if (existsSync(botDataDir)) {
        await rm(botDataDir, { recursive: true, force: true });
        console.log(`Deleted data directory: ${botDataDir}`);
      }

      // Delete cache directory (RAG indexes)
      if (existsSync(botCacheDir)) {
        await rm(botCacheDir, { recursive: true, force: true });
        console.log(`Deleted cache directory: ${botCacheDir}`);
      }
    } catch (fsError) {
      // Log but don't fail the deletion if file system operations fail
      console.error(`Error deleting bot directories for ${id}:`, fsError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bot:', error);
    return NextResponse.json(
      { error: 'Failed to delete bot' },
      { status: 500 }
    );
  }
}

