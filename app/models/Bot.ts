import { ObjectId } from 'mongodb';

export interface BotDocument {
  _id?: ObjectId;
  id: string;
  name: string;
  agentName: string;
  welcomeMessage: string;
  primaryColor: string;
  position: 'bottom-left' | 'bottom-right';
  role?: string; // Role/tag displayed in header
  inputPlaceholder?: string; // Placeholder text for the chat input field
  widgetIcon?: 'message-circle' | 'bot' | 'sparkles' | 'help-circle'; // Widget icon type
  knowledgeBase?: string;
  files?: string[]; // File names or IDs stored in MongoDB
  avatarImage?: string; // Base64 encoded image or image URL
  previewUrl?: string; // Website URL for preview iframe
  status?: 'Active' | 'Inactive'; // Bot status for dashboard
  createdAt?: Date;
  updatedAt?: Date;
}

export function botToDocument(bot: any): BotDocument {
  return {
    id: bot.id,
    name: bot.name,
    agentName: bot.agentName,
    welcomeMessage: bot.welcomeMessage,
    primaryColor: bot.primaryColor,
    position: bot.position,
    role: bot.role,
    inputPlaceholder: bot.inputPlaceholder,
    widgetIcon: bot.widgetIcon,
    knowledgeBase: bot.knowledgeBase,
    files: bot.files?.map((f: any) => typeof f === 'string' ? f : f.name) || undefined,
    avatarImage: bot.avatarImage,
    previewUrl: bot.previewUrl,
    status: bot.status || 'Inactive',
    createdAt: bot.createdAt || new Date(),
    updatedAt: new Date(),
  };
}

export function documentToBot(doc: BotDocument): any {
  return {
    id: doc.id,
    name: doc.name,
    agentName: doc.agentName,
    welcomeMessage: doc.welcomeMessage,
    primaryColor: doc.primaryColor,
    position: doc.position,
    role: doc.role,
    inputPlaceholder: doc.inputPlaceholder,
    widgetIcon: doc.widgetIcon,
    knowledgeBase: doc.knowledgeBase,
    files: doc.files,
    avatarImage: doc.avatarImage,
    previewUrl: doc.previewUrl,
    status: doc.status || 'Inactive',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

