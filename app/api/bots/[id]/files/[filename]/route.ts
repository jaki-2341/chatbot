import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';
import { getDatabase } from '@/lib/mongodb';
import { documentToBot, BotDocument } from '@/app/models/Bot';
import { rm } from 'fs/promises';

const STORAGE_DIR = './data';
const STORAGE_CACHE_DIR = './cache';
// const STORAGE_DIR = '/tmp/data';
// const STORAGE_CACHE_DIR = '/tmp/cache';

// DELETE /api/bots/[id]/files/[filename] - Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; filename: string } }
) {
  try {
    const botId = params.id;
    const filename = decodeURIComponent(params.filename);

    // Get bot from MongoDB
    const db = await getDatabase();
    const botDoc = await db.collection('bots').findOne({ id: botId });

    if (!botDoc) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Remove file from disk
    const botDataDir = path.join(STORAGE_DIR, botId);
    const filePath = path.join(botDataDir, filename);

    if (existsSync(filePath)) {
      const { unlink } = await import('fs/promises');
      await unlink(filePath);
    }

    // Update bot's files array in MongoDB
    const bot = documentToBot(botDoc as BotDocument);
    const existingFiles = (bot.files || []).filter((f: string | File): f is string => typeof f === 'string');
    const updatedFiles = existingFiles.filter((f: string) => f !== filename);

    await db.collection('bots').updateOne(
      { id: botId },
      { $set: { files: updatedFiles, updatedAt: new Date() } }
    );

    // Clear cache folder to force regeneration on next chat
    // This ensures deleted files are removed from the index
    const botCacheDir = path.join(STORAGE_CACHE_DIR, botId);
    if (existsSync(botCacheDir)) {
      try {
        await rm(botCacheDir, { recursive: true, force: true });
        console.log(`Cleared cache directory for bot ${botId} after file deletion`);
      } catch (cacheError) {
        // Log but don't fail the deletion if cache clearing fails
        console.error(`Error clearing cache directory for bot ${botId}:`, cacheError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file', details: (error as Error).message },
      { status: 500 }
    );
  }
}

