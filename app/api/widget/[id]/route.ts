import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { documentToBot, BotDocument } from '@/app/models/Bot';

export const dynamic = 'force-dynamic';

// CORS headers for widget access from external domains
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// GET - Get bot data for widget (public endpoint)
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
        { status: 404, headers: corsHeaders }
      );
    }

    const botData = documentToBot(bot as BotDocument);
    
    // Return only necessary data for widget (exclude sensitive info)
    return NextResponse.json(
      {
        id: botData.id,
        name: botData.name,
        agentName: botData.agentName,
        welcomeMessage: botData.welcomeMessage,
        primaryColor: botData.primaryColor,
        position: botData.position,
        role: botData.role,
        inputPlaceholder: botData.inputPlaceholder,
        widgetIcon: botData.widgetIcon,
        showAvatarOnButton: botData.showAvatarOnButton,
        avatarImage: botData.avatarImage,
        knowledgeBase: botData.knowledgeBase,
        status: botData.status || 'Inactive',
        suggestedQuestions: botData.suggestedQuestions,
        collectInfoEnabled: botData.collectInfoEnabled,
        collectName: botData.collectName,
        collectEmail: botData.collectEmail,
        collectPhone: botData.collectPhone,
        ctaEnabled: botData.ctaEnabled,
        ctaStatus: botData.ctaStatus,
        ctaText: botData.ctaText,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error fetching bot for widget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bot' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

