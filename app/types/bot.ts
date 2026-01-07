export interface Bot {
  id: string;
  name: string;
  agentName: string;
  welcomeMessage: string;
  primaryColor: string;
  position: 'bottom-left' | 'bottom-right';
  role?: string; // Role/tag displayed in header (e.g., "Customer Support Agent")
  inputPlaceholder?: string; // Placeholder text for the chat input field
  widgetIcon?: 'message-circle' | 'bot' | 'sparkles' | 'help-circle'; // Widget icon type
  knowledgeBase?: string;
  files?: (File | string)[]; // Can be File objects (in memory) or strings (serialized)
  avatarImage?: string; // Base64 encoded image or image URL
  previewUrl?: string; // Website URL for preview iframe
  status?: 'Active' | 'Inactive'; // Bot status for dashboard
  createdAt?: Date;
  updatedAt?: Date;
}

export const COLORS = [
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#111827',
];

export const INITIAL_BOTS: Bot[] = [
  {
    id: 'bot_123abc',
    name: 'Customer Support',
    agentName: 'Sarah',
    welcomeMessage: 'Hi there! How can I help you today?',
    primaryColor: '#3B82F6',
    position: 'bottom-right',
    knowledgeBase: 'We sell cloud automation tools. Our business hours are Mon-Fri 9AM-5PM EST. Support email is help@company.com. Pricing starts at $29/mo.',
  },
  {
    id: 'bot_456def',
    name: 'Sales Assistant',
    agentName: 'Alex',
    welcomeMessage: 'Looking for the best deal? Let me help!',
    primaryColor: '#10B981',
    position: 'bottom-left',
    knowledgeBase: 'We are currently offering a 20% discount on all annual plans. Code: SAVE20. Our enterprise plan includes 24/7 priority support.',
  },
];

