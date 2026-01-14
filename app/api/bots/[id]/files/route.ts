import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getDatabase } from '@/lib/mongodb';
import { documentToBot, BotDocument } from '@/app/models/Bot';

const STORAGE_DIR = './data';
// const STORAGE_DIR = '/tmp/data';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/bots/[id]/files - Upload files for a bot
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const botId = params.id;

    // Get bot from MongoDB to verify it exists
    const db = await getDatabase();
    const botDoc = await db.collection('bots').findOne({ id: botId });

    if (!botDoc) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Create bot-specific directory
    const botDataDir = path.join(STORAGE_DIR, botId);
    if (!existsSync(botDataDir)) {
      await mkdir(botDataDir, { recursive: true });
    }

    const uploadedFiles: string[] = [];
    const errors: string[] = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File size exceeds 10MB limit`);
          continue;
        }

        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        
        if (!allowedTypes.includes(file.type)) {
          errors.push(`${file.name}: File type not supported`);
          continue;
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = new Uint8Array(bytes);

        // Sanitize filename
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(botDataDir, sanitizedFileName);

        // Save file to disk
        await writeFile(filePath, buffer);

        uploadedFiles.push(sanitizedFileName);
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        errors.push(`${file.name}: Upload failed`);
      }
    }

    // Update bot's files array in MongoDB
    const bot = documentToBot(botDoc as BotDocument);
    const existingFiles = (bot.files || []).filter((f: string | File): f is string => typeof f === 'string');
    const updatedFiles = [...existingFiles, ...uploadedFiles];

    await db.collection('bots').updateOne(
      { id: botId },
      { $set: { files: updatedFiles, updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Failed to upload files', details: (error as Error).message },
      { status: 500 }
    );
  }
}


