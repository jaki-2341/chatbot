import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({
        success: false,
        error: 'MONGODB_URI environment variable is not set',
        env: process.env.NODE_ENV,
      }, { status: 500 });
    }

    // Mask the URI for security (show only first 20 chars)
    const maskedUri = process.env.MONGODB_URI.substring(0, 20) + '...';

    // Try to connect
    const db = await getDatabase();
    
    // Try a simple operation
    const collections = await db.listCollections().toArray();
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      dbName: db.databaseName,
      collectionsCount: collections.length,
      collections: collections.map(c => c.name),
      maskedUri,
      env: process.env.NODE_ENV,
    });
  } catch (error: any) {
    console.error('MongoDB connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      errorName: error.name,
      errorCode: error.code,
      maskedUri: process.env.MONGODB_URI 
        ? process.env.MONGODB_URI.substring(0, 20) + '...' 
        : 'not set',
      env: process.env.NODE_ENV,
    }, { status: 500 });
  }
}
