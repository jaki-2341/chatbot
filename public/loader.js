(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.ChatbotWidget) {
    return;
  }

  // Get configuration from window
  const config = window.chatbotConfig || {};
  const botId = config.id;
  
  // Determine API base URL (in order of priority):
  // 1. Use config.apiUrl if provided (for custom API endpoints)
  // 2. Use data-api-url attribute from the script tag (set in embed code)
  // 3. Try to detect from current script's origin (if script is on same domain as API)
  // 4. Fallback to window.location.origin (for same-origin deployments)
  let apiBaseUrl = config.apiUrl;
  
  if (!apiBaseUrl) {
    // Try to get API URL from script tag's data-api-url attribute
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.src && script.src.includes('loader.js')) {
        const dataApiUrl = script.getAttribute('data-api-url');
        if (dataApiUrl) {
          apiBaseUrl = dataApiUrl;
          break;
        }
        // Also try to detect from script's origin if it's from same domain
        try {
          const scriptUrl = new URL(script.src);
          // Only use script origin if it's not a CDN (jsdelivr, cdnjs, etc.)
          if (!scriptUrl.hostname.includes('cdn.') && !scriptUrl.hostname.includes('jsdelivr')) {
            apiBaseUrl = scriptUrl.origin;
            break;
          }
        } catch (e) {
          // Invalid URL, continue
        }
      }
    }
    
    // Final fallback to window.location.origin
    if (!apiBaseUrl) {
      apiBaseUrl = window.location.origin;
    }
  }

  if (!botId) {
    console.error('ChatbotWidget: bot id is required in window.chatbotConfig');
    return;
  }

  // Widget state
  let botData = null;
  let isOpen = false;
  let messages = [];
  let isLoading = false;
  let welcomeMessageShown = false;
  let isInputFocused = false;
  let isStreamingWelcome = false;
  let streamingWelcomeTimeout = null;
  // Info collection state
  let hasRequestedInfo = false;
  let collectingField = null;
  let collectedFields = new Set();
  let collectedInfo = {};
  let askingMessageId = null;
  let showInfoCollectionBubble = false;
  let infoBubbleCreated = false;

  // Get welcome message - use as-is from bot configuration
  function getWelcomeMessage() {
    return botData?.welcomeMessage || 'Hello! How can I help you today?';
  }

  // Simple markdown to HTML converter (basic support)
  function markdownToHtml(text) {
    if (!text) return '';
    
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
      .replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  }

  // Fetch bot data
  async function loadBotData() {
    try {
      const response = await fetch(`${apiBaseUrl}/api/widget/${botId}`);
      if (!response.ok) {
        throw new Error('Failed to load bot data');
      }
      botData = await response.json();
      
      // Only initialize widget if bot status is Active
      // Inactive bots should not be displayed on embedded websites
      if (botData.status === 'Active') {
        initializeWidget();
      } else {
        // Bot is inactive - don't show the widget
        console.log('ChatbotWidget: Bot is inactive, widget will not be displayed');
        return;
      }
    } catch (error) {
      console.error('ChatbotWidget: Failed to load bot data', error);
      showError('Failed to load chatbot. Please try again later.');
    }
  }

  // Helper function to convert hex to rgba
  function hexToRgba(hex, alpha = 0.25) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Initialize widget UI
  function initializeWidget() {
    if (!botData) return;

    const position = botData.position || config.position || 'bottom-right';
    const primaryColor = botData.primaryColor || '#3B82F6';
    const primaryColorRgba = hexToRgba(primaryColor, 0.25);
    
    // Helper function to adjust color brightness (for gradient)
    function adjustColor(hex, amount) {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.max(0, Math.min(255, (num >> 16) + amount));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
      const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    const gradientEndColor = adjustColor(primaryColor, -20);
    
    // Load Inter font from Google Fonts if not already loaded
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(fontLink);
    }

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      .chatbot-widget-container {
        position: fixed;
        ${position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
        bottom: 24px;
        z-index: 999999;
        font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
      }
      .chatbot-widget-button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background-color: ${primaryColor};
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        transition: transform 0.2s;
        color: white;
        animation: chatbot-pulse 2s ease-in-out infinite;
      }
      .chatbot-widget-button:hover {
        transform: scale(1.05);
        animation: none;
      }
      .chatbot-widget-button:active {
        transform: scale(0.95);
        animation: none;
      }
      @keyframes chatbot-pulse {
        0%, 100% {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 0 ${primaryColorRgba};
        }
        50% {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 8px ${primaryColorRgba};
        }
      }
      .chatbot-widget-button svg {
        width: 28px;
        height: 28px;
      }
      .chatbot-widget-window {
        position: absolute;
        bottom: 70px;
        ${position === 'bottom-right' ? 'right: 0;' : 'left: 0;'}
        width: 350px;
        height: 600px;
        max-height: calc(100vh - 100px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(10px) scale(0.95);
        transition: opacity 0.3s, transform 0.3s;
        pointer-events: none;
      }
      .chatbot-widget-window.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }
      @media (max-width: 480px) {
        .chatbot-widget-window {
          position: fixed;
          bottom: 12px;
          ${position === 'bottom-right' ? 'right: 12px;' : 'left: 12px;'}
          width: 350px;
          height: calc(100vh - 24px);
          max-height: calc(100vh - 24px);
          border-radius: 16px;
          transform: translateY(100%);
          z-index: 1000000;
        }
        .chatbot-widget-window.open {
          transform: translateY(0);
        }
        .chatbot-widget-container {
          z-index: 1000000;
        }
      }
      .chatbot-widget-header {
        background-color: ${primaryColor};
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .chatbot-widget-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .chatbot-widget-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
        background-color: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        position: relative;
      }
      .chatbot-widget-avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }
      .chatbot-widget-status-indicator {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
      .chatbot-widget-status-indicator.active {
        background-color: #10B981;
      }
      .chatbot-widget-status-indicator.inactive {
        background-color: #EF4444;
      }
      .chatbot-widget-header-info h3 {
        margin: 0;
        font-size: 14px;
        font-weight: bold;
      }
      .chatbot-widget-header-info p {
        margin: 0;
        font-size: 12px;
        opacity: 0.9;
      }
      .chatbot-widget-header-actions {
        display: flex;
        gap: 8px;
      }
      .chatbot-widget-header-btn {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        opacity: 0.8;
        transition: opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chatbot-widget-header-btn:hover {
        opacity: 1;
      }
      .chatbot-widget-header-btn svg {
        width: 16px;
        height: 16px;
      }
      .chatbot-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f9fafb;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .chatbot-widget-messages::-webkit-scrollbar {
        display: none;
      }
      .chatbot-widget-messages {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .chatbot-widget-message {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        animation: chatbot-slideIn 0.3s ease-out forwards;
      }
      .chatbot-widget-message.user {
        flex-direction: row-reverse;
      }
      @keyframes chatbot-slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .chatbot-widget-message-avatar {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 11px;
      }
      .chatbot-widget-message-avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }
      .chatbot-widget-message-content {
        max-width: 80%;
        padding: 12px;
        font-size: 14px;
        line-height: 1.5;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      }
      .chatbot-widget-message-content .whitespace-pre-wrap {
        white-space: pre-wrap;
      }
      .chatbot-widget-message.user .chatbot-widget-message-content {
        background-color: ${primaryColor};
        color: white;
        border-radius: 12px 12px 0 12px;
      }
      .chatbot-widget-message.assistant .chatbot-widget-message-content {
        background: white;
        color: #374151;
        border: 1px solid #e5e7eb;
        border-radius: 0 12px 12px 12px;
      }
      .chatbot-widget-message-content .markdown-content {
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      .chatbot-widget-message-content p {
        margin: 0 0 8px 0;
        line-height: 1.6;
      }
      .chatbot-widget-message-content p:last-child {
        margin-bottom: 0;
      }
      .chatbot-widget-message-content .markdown-content p {
        margin-bottom: 8px;
        line-height: 1.6;
      }
      .chatbot-widget-message-content .markdown-content p:last-child {
        margin-bottom: 0;
      }
      .chatbot-widget-message-content .markdown-content ul {
        list-style-type: disc;
        list-style-position: inside;
        margin: 8px 0;
        padding-left: 8px;
      }
      .chatbot-widget-message-content .markdown-content ol {
        list-style-type: decimal;
        list-style-position: inside;
        margin: 8px 0;
        padding-left: 8px;
      }
      .chatbot-widget-message-content .markdown-content li {
        margin: 4px 0;
        line-height: 1.6;
      }
      .chatbot-widget-message-content h1,
      .chatbot-widget-message-content h2,
      .chatbot-widget-message-content h3 {
        margin: 8px 0 4px 0;
        font-weight: bold;
      }
      .chatbot-widget-message-content h1 { font-size: 16px; }
      .chatbot-widget-message-content h2 { font-size: 15px; }
      .chatbot-widget-message-content h3 { font-size: 14px; }
      .chatbot-widget-message-content strong {
        font-weight: 600;
        color: #111827;
      }
      .chatbot-widget-message-content em {
        font-style: italic;
      }
      .chatbot-widget-message-content a {
        color: #2563eb;
        text-decoration: underline;
      }
      .chatbot-widget-message-content a:hover {
        color: #1d4ed8;
      }
      .chatbot-widget-message-content blockquote {
        border-left: 4px solid #d1d5db;
        padding-left: 16px;
        margin: 8px 0;
        font-style: italic;
        color: #4b5563;
      }
      .chatbot-widget-message-content hr {
        margin: 12px 0;
        border: none;
        border-top: 1px solid #e5e7eb;
      }
      .chatbot-widget-message-content table {
        min-width: 100%;
        border: 1px solid #e5e7eb;
        margin: 8px 0;
        border-collapse: collapse;
      }
      .chatbot-widget-message-content thead {
        background: #f9fafb;
      }
      .chatbot-widget-message-content tr {
        border-bottom: 1px solid #e5e7eb;
      }
      .chatbot-widget-message-content th {
        padding: 8px 12px;
        text-align: left;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
      }
      .chatbot-widget-message-content td {
        padding: 8px 12px;
        font-size: 12px;
      }
      .chatbot-widget-message-content code {
        background: #faf5ff;
        color: #9333ea;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        font-family: 'Courier New', monospace;
      }
      .chatbot-widget-message-content pre {
        background: #1f2937;
        color: #f9fafb;
        padding: 12px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 8px 0;
        font-size: 12px;
        font-family: 'Courier New', monospace;
      }
      .chatbot-widget-message-content pre code {
        background: none;
        padding: 0;
        color: inherit;
      }
      .chatbot-widget-message-content ul,
      .chatbot-widget-message-content ol {
        margin: 8px 0;
        padding-left: 20px;
        list-style-position: inside;
      }
      .chatbot-widget-message-content ul {
        list-style-type: disc;
      }
      .chatbot-widget-message-content ol {
        list-style-type: decimal;
      }
      .chatbot-widget-message-content li {
        margin: 4px 0;
        line-height: 1.6;
      }
      .chatbot-widget-input-container {
        padding: 0;
        background: white;
        display: flex;
        flex-direction: column;
      }
      .chatbot-widget-input-form {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #f3f4f6;
      }
      .chatbot-widget-input {
        flex: 1;
        border: none;
        background: #f9fafb;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        outline: none;
        font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
      }
      .chatbot-widget-input::placeholder {
        color: #9CA3AF;
        opacity: 1;
      }
      .chatbot-widget-input:focus {
        box-shadow: 0 0 0 2px ${primaryColorRgba};
        border-color: ${primaryColor};
      }
      .chatbot-widget-send-btn {
        width: auto;
        height: auto;
        padding: 8px;
        border-radius: 8px;
        background: ${primaryColor};
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, opacity 0.2s;
      }
      .chatbot-widget-send-btn:hover {
        opacity: 0.9;
      }
      .chatbot-widget-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .chatbot-widget-send-btn svg {
        width: 16px;
        height: 16px;
      }
      .chatbot-widget-footer {
        text-align: center;
        margin-top: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .chatbot-widget-footer-icon {
        width: 12px;
        height: 12px;
        color: #a855f7;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chatbot-widget-footer-icon svg {
        width: 12px;
        height: 12px;
      }
      .chatbot-widget-footer-text {
        font-size: 12px;
        color: #9ca3af;
        margin: 0;
      }
      .chatbot-widget-loading {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      .chatbot-widget-loading-dots {
        display: flex;
        gap: 4px;
        padding: 12px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0 12px 12px 12px;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        align-items: center;
        height: 40px;
        box-sizing: border-box;
      }
      .chatbot-widget-loading-dot {
        width: 6px;
        height: 6px;
        min-width: 6px;
        min-height: 6px;
        max-width: 6px;
        max-height: 6px;
        border-radius: 50%;
        background: #9ca3af;
        animation: chatbot-bounce 1.4s infinite ease-in-out both;
        display: inline-block;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      .chatbot-widget-loading-dot:nth-child(1) { animation-delay: -0.32s; }
      .chatbot-widget-loading-dot:nth-child(2) { animation-delay: -0.16s; }
      .chatbot-widget-loading-dot:nth-child(1) { animation-delay: -0.32s; }
      .chatbot-widget-loading-dot:nth-child(2) { animation-delay: -0.16s; }
      @keyframes chatbot-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      .chatbot-widget-error {
        padding: 12px;
        background: #fee2e2;
        color: #991b1b;
        border-radius: 8px;
        font-size: 14px;
        margin: 16px;
      }
      /* Welcome Screen Styles */
      .chatbot-widget-welcome-screen {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #f9fafb;
        overflow: hidden;
      }
      .chatbot-widget-welcome-header {
        padding: 32px 32px 64px 32px;
        position: relative;
        overflow: hidden;
        border-radius: 0;
      }
      .chatbot-widget-welcome-header-gradient {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(to bottom right, ${primaryColor}, ${gradientEndColor});
      }
      .chatbot-widget-welcome-header-decoration {
        position: absolute;
        top: 0;
        right: 0;
        width: 160px;
        height: 160px;
        background: white;
        opacity: 0.1;
        border-radius: 50%;
        filter: blur(40px);
        transform: translate(40px, -40px);
      }
      .chatbot-widget-welcome-header-content {
        position: relative;
        z-index: 10;
      }
      .chatbot-widget-welcome-header-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }
      .chatbot-widget-welcome-avatar-large {
        width: 80px;
        height: 80px;
        border-radius: 16px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 32px;
        font-weight: bold;
        border: 4px solid rgba(255, 255, 255, 0.2);
        overflow: hidden;
      }
      .chatbot-widget-welcome-avatar-large img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .chatbot-widget-welcome-hello {
        color: white;
        font-size: 30px;
        font-weight: bold;
        margin: 0;
      }
      .chatbot-widget-welcome-description {
        color: rgba(255, 255, 255, 0.8);
        font-size: 18px;
        margin: 0;
        line-height: 1.5;
      }
      .chatbot-widget-welcome-close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        padding: 4px;
        transition: color 0.2s;
      }
      .chatbot-widget-welcome-close-btn:hover {
        color: white;
      }
      .chatbot-widget-welcome-close-btn svg {
        width: 20px;
        height: 20px;
      }
      .chatbot-widget-welcome-card {
        margin: -40px 24px 0 24px;
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
        cursor: pointer;
        transition: box-shadow 0.2s;
        position: relative;
        z-index: 20;
        flex-shrink: 0;
        overflow: hidden;
        box-sizing: border-box;
      }
      .chatbot-widget-welcome-card:hover {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      .chatbot-widget-welcome-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .chatbot-widget-welcome-card-title {
        font-weight: bold;
        color: #111827;
        font-size: 18px;
        margin: 0;
      }
      .chatbot-widget-welcome-card-icon {
        width: 20px;
        height: 20px;
        transition: transform 0.2s;
      }
      .chatbot-widget-welcome-card:hover .chatbot-widget-welcome-card-icon {
        transform: translateX(4px);
      }
      .chatbot-widget-welcome-card-desc {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 16px 0;
      }
      .chatbot-widget-welcome-card-button {
        width: 100%;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        border: none;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 0;
        position: relative;
        z-index: 1;
        box-sizing: border-box;
      }
      .chatbot-widget-welcome-card-button:hover {
        background-color: ${primaryColor} !important;
        color: white !important;
      }
      .chatbot-widget-welcome-card-button svg {
        width: 12px;
        height: 12px;
      }
      .chatbot-widget-suggested-topics {
        padding: 24px;
        flex: 1;
        overflow-y: auto;
        min-height: 0;
      }
      .chatbot-widget-suggested-topics-title {
        font-size: 12px;
        font-weight: 600;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 12px 0;
      }
      .chatbot-widget-suggested-question {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        cursor: pointer;
        margin-bottom: 8px;
        transition: all 0.2s;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      }
      .chatbot-widget-suggested-question:hover {
        background: #eff6ff;
        border-color: #bfdbfe;
      }
      .chatbot-widget-suggested-question-text {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        flex: 1;
      }
      .chatbot-widget-suggested-question:hover .chatbot-widget-suggested-question-text {
        color: #2563eb;
      }
      .chatbot-widget-suggested-question-icon {
        width: 16px;
        height: 16px;
        color: #9ca3af;
        transition: color 0.2s, transform 0.2s;
      }
      .chatbot-widget-suggested-question:hover .chatbot-widget-suggested-question-icon {
        color: #2563eb;
        transform: translateX(2px);
      }
      .chatbot-widget-welcome-footer {
        padding: 16px;
        text-align: center;
        border-top: 1px solid #f3f4f6;
        background: white;
        flex-shrink: 0;
        margin-top: auto;
      }
      .chatbot-widget-welcome-footer-text {
        font-size: 12px;
        color: #9ca3af;
        margin: 0;
      }
      .chatbot-widget-welcome-footer-text strong {
        font-weight: bold;
        color: ${primaryColor};
      }
      /* Info Collection Form Styles */
      .chatbot-widget-info-form {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
      }
      .chatbot-widget-info-form-input {
        width: 100%;
        padding: 8px 12px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        outline: none;
        margin-bottom: 8px;
        box-sizing: border-box;
      }
      .chatbot-widget-info-form-input:focus {
        border-color: ${primaryColor};
        box-shadow: 0 0 0 1px ${primaryColor};
      }
      .chatbot-widget-info-form-buttons {
        display: flex;
        gap: 8px;
      }
      .chatbot-widget-info-form-skip-btn {
        flex: 1;
        padding: 8px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        background: #f3f4f6;
        border: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .chatbot-widget-info-form-skip-btn:hover {
        background: #e5e7eb;
      }
      .chatbot-widget-info-form-send-btn {
        flex: 1;
        padding: 8px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: white;
        background: ${primaryColor};
        border: none;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .chatbot-widget-info-form-send-btn:hover {
        opacity: 0.9;
      }
      /* Conversation View Header (shown when chatting) */
      .chatbot-widget-conversation-header {
        display: none;
        padding: 16px;
        background-color: ${primaryColor};
        color: white;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      .chatbot-widget-conversation-header.show {
        display: flex;
      }
      .chatbot-widget-conversation-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .chatbot-widget-conversation-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        font-weight: bold;
        font-size: 14px;
        position: relative;
        overflow: hidden;
      }
      .chatbot-widget-conversation-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .chatbot-widget-conversation-header-info h3 {
        margin: 0;
        font-size: 14px;
        font-weight: bold;
      }
      .chatbot-widget-conversation-header-info p {
        margin: 0;
        font-size: 12px;
        opacity: 0.9;
      }
      /* Footer in conversation view */
      .chatbot-widget-conversation-footer {
        display: none;
        padding: 16px;
        text-align: center;
        border-top: 1px solid #f3f4f6;
        background: white;
        flex-shrink: 0;
      }
      .chatbot-widget-conversation-footer.show {
        display: block;
      }
      @media (max-width: 480px) {
        /* Remove the old media query block since we moved it up */
      }
    `;
    document.head.appendChild(style);

    // Create container
    const container = document.createElement('div');
    container.className = 'chatbot-widget-container';
    container.id = 'chatbot-widget-container';

    // Create button
    const button = document.createElement('button');
    button.className = 'chatbot-widget-button';
    button.setAttribute('aria-label', 'Open chat');
    button.id = 'chatbot-widget-toggle-button';
  // Set initial icon based on widgetIcon preference (directly, before DOM append)
  button.innerHTML = getIconSVG(botData?.widgetIcon || 'message-circle');
    button.onclick = toggleWidget;

    // Create window
    const window = createChatWindow(primaryColor);
    
    container.appendChild(window);
    container.appendChild(button);
    document.body.appendChild(container);

    // Ensure icon is correct once in DOM (handles future toggles)
    updateButtonIcon();

    // Show static welcome message initially (will be shown when widget opens)
    // Don't add welcome message here - it will be added when user first opens the chat
  }

  // Create chat window
  function createChatWindow(primaryColor) {
    const window = document.createElement('div');
    window.className = 'chatbot-widget-window';

    // Header
    const header = document.createElement('div');
    header.className = 'chatbot-widget-header';
    
    const headerLeft = document.createElement('div');
    headerLeft.className = 'chatbot-widget-header-left';
    
    const avatar = document.createElement('div');
    avatar.className = 'chatbot-widget-avatar';
    if (botData.avatarImage) {
      const img = document.createElement('img');
      img.src = botData.avatarImage;
      img.alt = botData.agentName;
      avatar.appendChild(img);
    } else {
      avatar.textContent = (botData.agentName || 'A').charAt(0).toUpperCase();
    }
    
    // Add status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'chatbot-widget-status-indicator';
    const isActive = (botData.status || 'Inactive') === 'Active';
    statusIndicator.classList.add(isActive ? 'active' : 'inactive');
    avatar.appendChild(statusIndicator);
    
    const headerInfo = document.createElement('div');
    headerInfo.className = 'chatbot-widget-header-info';
    const name = document.createElement('h3');
    name.textContent = botData.agentName || 'Assistant';
    headerInfo.appendChild(name);
    if (botData.role) {
      const role = document.createElement('p');
      role.textContent = botData.role;
      headerInfo.appendChild(role);
    }
    
    headerLeft.appendChild(avatar);
    headerLeft.appendChild(headerInfo);
    
    const headerActions = document.createElement('div');
    headerActions.className = 'chatbot-widget-header-actions';
    
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'chatbot-widget-header-btn';
    // RefreshCw icon SVG (from lucide-react)
    refreshBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>';
    refreshBtn.setAttribute('aria-label', 'Refresh');
    refreshBtn.onclick = handleRefresh;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'chatbot-widget-header-btn';
    // X icon SVG (from lucide-react)
    closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.onclick = toggleWidget;
    
    headerActions.appendChild(refreshBtn);
    headerActions.appendChild(closeBtn);
    
    header.appendChild(headerLeft);
    header.appendChild(headerActions);

    // Welcome Screen Container (shown when not chatting)
    const welcomeScreen = document.createElement('div');
    welcomeScreen.className = 'chatbot-widget-welcome-screen';
    welcomeScreen.id = 'chatbot-widget-welcome-screen';
    
    // Welcome Header with Gradient
    const welcomeHeader = document.createElement('div');
    welcomeHeader.className = 'chatbot-widget-welcome-header';
    const headerGradient = document.createElement('div');
    headerGradient.className = 'chatbot-widget-welcome-header-gradient';
    const headerDecoration = document.createElement('div');
    headerDecoration.className = 'chatbot-widget-welcome-header-decoration';
    headerGradient.appendChild(headerDecoration);
    
    const headerContent = document.createElement('div');
    headerContent.className = 'chatbot-widget-welcome-header-content';
    
    // First Row: Avatar and Hello!
    const headerRow = document.createElement('div');
    headerRow.className = 'chatbot-widget-welcome-header-row';
    
    const largeAvatar = document.createElement('div');
    largeAvatar.className = 'chatbot-widget-welcome-avatar-large';
    if (botData.avatarImage) {
      const avatarImg = document.createElement('img');
      avatarImg.src = botData.avatarImage;
      avatarImg.alt = botData.agentName || 'Bot';
      largeAvatar.appendChild(avatarImg);
    } else {
      largeAvatar.textContent = (botData.agentName || botData.name || 'A').charAt(0).toUpperCase();
    }
    
    const helloText = document.createElement('h2');
    helloText.className = 'chatbot-widget-welcome-hello';
    helloText.textContent = 'Hello!';
    
    headerRow.appendChild(largeAvatar);
    headerRow.appendChild(helloText);
    
    // Second Row: Description
    const description = document.createElement('p');
    description.className = 'chatbot-widget-welcome-description';
    const roleText = botData.role || 'AI assistant';
    description.textContent = botData.agentName 
      ? `I'm ${botData.agentName}, your ${roleText}. How can I help you today?`
      : `I'm your ${roleText}. How can I help you today?`;
    
    headerContent.appendChild(headerRow);
    headerContent.appendChild(description);
    
    // Close button
    const welcomeCloseBtn = document.createElement('button');
    welcomeCloseBtn.className = 'chatbot-widget-welcome-close-btn';
    welcomeCloseBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    welcomeCloseBtn.onclick = toggleWidget;
    
    welcomeHeader.appendChild(headerGradient);
    welcomeHeader.appendChild(headerContent);
    welcomeHeader.appendChild(welcomeCloseBtn);
    
    // Main Action Card
    const actionCard = document.createElement('div');
    actionCard.className = 'chatbot-widget-welcome-card';
    actionCard.onclick = function() {
      isInputFocused = true;
      updateWelcomeScreen();
      const input = document.getElementById('chatbot-widget-input');
      if (input) {
        setTimeout(() => {
          input.focus();
          // Ensure input container is visible
          const inputContainer = document.getElementById('chatbot-widget-input-container');
          if (inputContainer) {
            inputContainer.style.display = 'block';
          }
        }, 100);
      }
    };
    
    const cardHeader = document.createElement('div');
    cardHeader.className = 'chatbot-widget-welcome-card-header';
    const cardTitle = document.createElement('h3');
    cardTitle.className = 'chatbot-widget-welcome-card-title';
    cardTitle.textContent = 'Send us a message';
    const cardIcon = document.createElement('div');
    cardIcon.className = 'chatbot-widget-welcome-card-icon';
    cardIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: ' + primaryColor + ';"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    cardHeader.appendChild(cardTitle);
    cardHeader.appendChild(cardIcon);
    
    const cardDesc = document.createElement('p');
    cardDesc.className = 'chatbot-widget-welcome-card-desc';
    cardDesc.textContent = 'Our AI assistant replies instantly.'; // This is static text, matches live preview
    
    const cardButton = document.createElement('div');
    cardButton.className = 'chatbot-widget-welcome-card-button';
    cardButton.style.backgroundColor = primaryColor + '15';
    cardButton.style.color = primaryColor;
    cardButton.innerHTML = 'Start Conversation <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
    
    // Add hover effect to match live preview
    cardButton.addEventListener('mouseenter', function() {
      this.style.backgroundColor = primaryColor;
      this.style.color = 'white';
    });
    cardButton.addEventListener('mouseleave', function() {
      this.style.backgroundColor = primaryColor + '15';
      this.style.color = primaryColor;
    });
    
    actionCard.appendChild(cardHeader);
    actionCard.appendChild(cardDesc);
    actionCard.appendChild(cardButton);
    
    // Suggested Topics Section
    const suggestedTopics = document.createElement('div');
    suggestedTopics.className = 'chatbot-widget-suggested-topics';
    
    // Get suggested questions from bot configuration
    const questions = (botData.suggestedQuestions && Array.isArray(botData.suggestedQuestions) && botData.suggestedQuestions.length > 0)
      ? botData.suggestedQuestions.filter(q => q && q.trim() !== '') // Filter out empty questions
      : []; // No default fallback - only show if user has configured questions
    
    // Only show suggested topics section if there are questions
    if (questions.length > 0) {
      const topicsTitle = document.createElement('h4');
      topicsTitle.className = 'chatbot-widget-suggested-topics-title';
      topicsTitle.textContent = 'Suggested Topics';
      suggestedTopics.appendChild(topicsTitle);
      
      const questionsList = document.createElement('div');
      
      questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'chatbot-widget-suggested-question';
        questionDiv.onclick = function() {
          const input = document.getElementById('chatbot-widget-input');
          if (input) {
            input.value = question;
            isInputFocused = true;
            updateWelcomeScreen();
            handleSubmit();
          }
        };
        
        const questionText = document.createElement('span');
        questionText.className = 'chatbot-widget-suggested-question-text';
        questionText.textContent = question.trim();
        
        const questionIcon = document.createElement('div');
        questionIcon.className = 'chatbot-widget-suggested-question-icon';
        questionIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        
        questionDiv.appendChild(questionText);
        questionDiv.appendChild(questionIcon);
        questionsList.appendChild(questionDiv);
      });
      
      suggestedTopics.appendChild(questionsList);
    }
    
    // Welcome Footer
    const welcomeFooter = document.createElement('div');
    welcomeFooter.className = 'chatbot-widget-welcome-footer';
    const welcomeFooterText = document.createElement('p');
    welcomeFooterText.className = 'chatbot-widget-welcome-footer-text';
    welcomeFooterText.innerHTML = 'Powered by <strong style="color: ' + primaryColor + ';">Proweaver</strong>';
    welcomeFooter.appendChild(welcomeFooterText);
    
    welcomeScreen.appendChild(welcomeHeader);
    welcomeScreen.appendChild(actionCard);
    // Only append suggestedTopics if it has content (questions exist)
    if (suggestedTopics.children.length > 0) {
      welcomeScreen.appendChild(suggestedTopics);
    }
    welcomeScreen.appendChild(welcomeFooter);
    
    // Messages container (for conversation view)
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chatbot-widget-messages';
    messagesContainer.id = 'chatbot-widget-messages';
    messagesContainer.style.display = 'none';

    // Conversation Header (shown when user starts chatting)
    const conversationHeader = document.createElement('div');
    conversationHeader.className = 'chatbot-widget-conversation-header';
    conversationHeader.id = 'chatbot-widget-conversation-header';
    
    const convHeaderLeft = document.createElement('div');
    convHeaderLeft.className = 'chatbot-widget-conversation-header-left';
    
    const convAvatar = document.createElement('div');
    convAvatar.className = 'chatbot-widget-conversation-avatar';
    if (botData.avatarImage) {
      const convAvatarImg = document.createElement('img');
      convAvatarImg.src = botData.avatarImage;
      convAvatarImg.alt = botData.agentName;
      convAvatar.appendChild(convAvatarImg);
    } else {
      convAvatar.textContent = (botData.agentName || 'A').charAt(0).toUpperCase();
    }
    
    const convHeaderInfo = document.createElement('div');
    convHeaderInfo.className = 'chatbot-widget-conversation-header-info';
    const convName = document.createElement('h3');
    convName.textContent = botData.agentName || 'Assistant';
    const convRole = document.createElement('p');
    convRole.textContent = botData.role || 'AI Assistant';
    convHeaderInfo.appendChild(convName);
    convHeaderInfo.appendChild(convRole);
    
    convHeaderLeft.appendChild(convAvatar);
    convHeaderLeft.appendChild(convHeaderInfo);
    
    const convHeaderActions = document.createElement('div');
    convHeaderActions.className = 'chatbot-widget-header-actions';
    const convRefreshBtn = document.createElement('button');
    convRefreshBtn.className = 'chatbot-widget-header-btn';
    convRefreshBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>';
    convRefreshBtn.onclick = handleRefresh;
    const convCloseBtn = document.createElement('button');
    convCloseBtn.className = 'chatbot-widget-header-btn';
    convCloseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    convCloseBtn.onclick = toggleWidget;
    convHeaderActions.appendChild(convRefreshBtn);
    convHeaderActions.appendChild(convCloseBtn);
    
    conversationHeader.appendChild(convHeaderLeft);
    conversationHeader.appendChild(convHeaderActions);
    
    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'chatbot-widget-input-container';
    inputContainer.id = 'chatbot-widget-input-container';
    inputContainer.style.display = 'none'; // Initially hidden, shown when user starts conversation
    
    // Use div instead of form to prevent page reload (matches preview structure)
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'chatbot-widget-input-form';
    
    const input = document.createElement('input');
    input.className = 'chatbot-widget-input';
    input.type = 'text';
    input.placeholder = botData.inputPlaceholder || 'Type a message...';
    input.id = 'chatbot-widget-input';
    input.addEventListener('focus', function() {
      isInputFocused = true;
      // Ensure input container is visible when focused
      const inputContainer = document.getElementById('chatbot-widget-input-container');
      if (inputContainer) {
        inputContainer.style.display = 'block';
      }
      updateWelcomeScreen();
      startStreamingWelcome();
    });
    input.addEventListener('blur', function() {
      // Don't set isInputFocused to false immediately - keep conversation view open
    });
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }
    });
    
    const sendBtn = document.createElement('button');
    sendBtn.className = 'chatbot-widget-send-btn';
    sendBtn.type = 'button';
    // Send icon SVG
    sendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    sendBtn.setAttribute('aria-label', 'Send');
    sendBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    });
    
    inputWrapper.appendChild(input);
    inputWrapper.appendChild(sendBtn);
    
    // Conversation Footer (shown when chatting)
    const conversationFooter = document.createElement('div');
    conversationFooter.className = 'chatbot-widget-conversation-footer';
    conversationFooter.id = 'chatbot-widget-conversation-footer';
    const convFooterText = document.createElement('p');
    convFooterText.className = 'chatbot-widget-footer-text';
    convFooterText.innerHTML = 'Powered by <strong style="color: ' + primaryColor + ';">Proweaver</strong>';
    conversationFooter.appendChild(convFooterText);
    
    inputContainer.appendChild(inputWrapper);
    inputContainer.appendChild(conversationFooter);

    // Append elements to window
    window.appendChild(header); // Original header (hidden when chatting)
    window.appendChild(welcomeScreen); // Welcome screen (shown initially)
    window.appendChild(conversationHeader); // Conversation header (shown when chatting)
    window.appendChild(messagesContainer); // Messages (shown when chatting)
    window.appendChild(inputContainer);

    return window;
  }

  // Update welcome screen and conversation view visibility
  function updateWelcomeScreen() {
    const welcomeScreen = document.getElementById('chatbot-widget-welcome-screen');
    const messagesContainer = document.getElementById('chatbot-widget-messages');
    const conversationHeader = document.getElementById('chatbot-widget-conversation-header');
    const conversationFooter = document.getElementById('chatbot-widget-conversation-footer');
    const originalHeader = document.querySelector('.chatbot-widget-header');
    const inputContainer = document.getElementById('chatbot-widget-input-container');
    
    const hasOnlyEmptyWelcome = messages.length === 0 || 
      (messages.length === 1 && messages[0].role === 'assistant' && (!messages[0].content || messages[0].content === ''));
    
    if (!isInputFocused && hasOnlyEmptyWelcome && !isStreamingWelcome) {
      // Show welcome screen
      if (welcomeScreen) welcomeScreen.style.display = 'flex';
      if (messagesContainer) messagesContainer.style.display = 'none';
      if (conversationHeader) conversationHeader.classList.remove('show');
      if (conversationFooter) conversationFooter.classList.remove('show');
      if (originalHeader) originalHeader.style.display = 'none';
      if (inputContainer) inputContainer.style.display = 'none'; // Hide input in welcome screen
    } else {
      // Show conversation view
      if (welcomeScreen) welcomeScreen.style.display = 'none';
      if (messagesContainer) messagesContainer.style.display = 'flex';
      if (conversationHeader) conversationHeader.classList.add('show');
      if (conversationFooter) conversationFooter.classList.add('show');
      if (originalHeader) originalHeader.style.display = 'none';
      if (inputContainer) inputContainer.style.display = 'block'; // Show input in conversation view
    }
  }

  // Start streaming welcome message when input is focused
  function startStreamingWelcome() {
    // Only stream if input is focused and welcome message is the only message (or doesn't exist yet)
    const hasOnlyWelcome = messages.length === 0 || 
      (messages.length === 1 && messages[0].role === 'assistant' && (!messages[0].content || messages[0].content === ''));
    
    if (!hasOnlyWelcome || !isInputFocused) {
      isStreamingWelcome = false;
      return;
    }
    
    const welcomeMessage = getWelcomeMessage();
    
    // Don't stream if welcome message is empty
    if (!welcomeMessage || welcomeMessage.trim() === '') {
      isStreamingWelcome = false;
      return;
    }
    
    // Clear any existing streaming timeout
    if (streamingWelcomeTimeout) {
      clearTimeout(streamingWelcomeTimeout);
      streamingWelcomeTimeout = null;
    }
    
    // Check if welcome message already exists with content
    const existingWelcome = messages.find(m => m.role === 'assistant' && m.content && m.content.trim() !== '');
    if (existingWelcome) {
      isStreamingWelcome = false;
      return;
    }
    
    // Reset streaming state
    isStreamingWelcome = true;
    updateWelcomeScreen();
    
    // Get messages container
    const messagesContainer = document.getElementById('chatbot-widget-messages');
    if (!messagesContainer) return;
    
    // Remove any empty welcome messages from DOM
    const emptyMessages = messagesContainer.querySelectorAll('.chatbot-widget-message.assistant');
    emptyMessages.forEach(msg => {
      const content = msg.querySelector('.markdown-content');
      if (content && (!content.textContent || content.textContent.trim() === '')) {
        msg.remove();
      }
    });
    
    // Remove any empty welcome messages from array
    messages = messages.filter(m => !(m.role === 'assistant' && (!m.content || m.content === '')));
    
    // Remove existing streaming welcome if any
    const existingStreaming = messagesContainer.querySelector('.chatbot-widget-message.streaming-welcome');
    if (existingStreaming) {
      existingStreaming.remove();
    }
    
    // Create streaming welcome message container (create once)
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chatbot-widget-message assistant streaming-welcome';
    
    const avatar = document.createElement('div');
    avatar.className = 'chatbot-widget-message-avatar';
      avatar.style.backgroundColor = botData.primaryColor || '#3B82F6';
    if (botData.avatarImage) {
      const img = document.createElement('img');
      img.src = botData.avatarImage;
      img.alt = botData.agentName;
      avatar.appendChild(img);
    } else {
      avatar.textContent = (botData.agentName || 'A').charAt(0).toUpperCase();
    }
    messageDiv.appendChild(avatar);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'chatbot-widget-message-content';
    const markdownWrapper = document.createElement('div');
    markdownWrapper.className = 'markdown-content';
    contentDiv.appendChild(markdownWrapper);
    messageDiv.appendChild(contentDiv);
    
    // Add to DOM once
    messagesContainer.appendChild(messageDiv);
    
    let charIndex = 0;
    const speed = 30; // milliseconds per character
    
    const streamWelcome = () => {
      if (charIndex < welcomeMessage.length) {
        // Just update the text content (don't recreate the div)
        markdownWrapper.textContent = welcomeMessage.substring(0, charIndex + 1);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        charIndex++;
        streamingWelcomeTimeout = setTimeout(streamWelcome, speed);
      } else {
        // Streaming complete
        isStreamingWelcome = false;
        // Update to final markdown version
        markdownWrapper.innerHTML = markdownToHtml(welcomeMessage);
        messageDiv.classList.remove('streaming-welcome');
        // Add to messages array
        messages.push({ role: 'assistant', content: welcomeMessage });
        welcomeMessageShown = true;
        updateWelcomeScreen();
      }
    };
    
    // Start streaming after a small delay
    streamingWelcomeTimeout = setTimeout(streamWelcome, 150);
  }

  // Add message to chat with streaming effect
  function addMessageStreaming(role, content, options = {}) {
    const messagesContainer = document.getElementById('chatbot-widget-messages');
    if (!messagesContainer) return;
    
    // Filter out empty welcome messages when input is not focused (static welcome is shown instead)
    if (role === 'assistant' && (!content || content === '') && !isInputFocused && !isStreamingWelcome) {
      return; // Don't add empty welcome message when static welcome should be shown
    }
    
    // Hide static welcome when adding messages
    updateWelcomeScreen();

    const { stream = false, speed = 30 } = options;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-widget-message ${role}`;
    if (options.id) {
      messageDiv.setAttribute('data-message-id', options.id);
    }

    if (role === 'assistant') {
      const avatar = document.createElement('div');
      avatar.className = 'chatbot-widget-message-avatar';
      avatar.style.backgroundColor = botData.primaryColor || '#3B82F6';
      
      if (botData.avatarImage) {
        const img = document.createElement('img');
        img.src = botData.avatarImage;
        img.alt = botData.agentName;
        avatar.appendChild(img);
      } else {
        avatar.textContent = (botData.agentName || 'A').charAt(0).toUpperCase();
      }
      messageDiv.appendChild(avatar);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'chatbot-widget-message-content';
    
    if (role === 'assistant') {
      // Wrap in markdown-content div to match preview structure
      const markdownWrapper = document.createElement('div');
      markdownWrapper.className = 'markdown-content';
      
      if (stream) {
        // For streaming, we'll update the text content character by character
        // Store plain text for streaming, then convert to markdown at the end
        let currentText = '';
        let charIndex = 0;
        
        const streamInterval = setInterval(() => {
          if (charIndex < content.length) {
            currentText += content[charIndex];
            // Update with plain text during streaming, convert to markdown at the end
            markdownWrapper.textContent = currentText;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            charIndex++;
          } else {
            clearInterval(streamInterval);
            // Convert to markdown HTML once streaming is complete
            markdownWrapper.innerHTML = markdownToHtml(content);
            messages.push({ role, content });
          }
        }, speed);
      } else {
        markdownWrapper.innerHTML = markdownToHtml(content);
        messages.push({ role, content });
      }
      
      contentDiv.appendChild(markdownWrapper);
    } else {
      // User messages use whitespace-pre-wrap
      const userText = document.createElement('span');
      userText.className = 'whitespace-pre-wrap';
      userText.textContent = content;
      contentDiv.appendChild(userText);
      const messageObj = { role, content };
      if (options.id) messageObj.id = options.id;
      messages.push(messageObj);
    }
    
    messageDiv.appendChild(contentDiv);

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    updateWelcomeScreen();
  }

  // Add message to chat (non-streaming, for regular messages)
  function addMessage(role, content) {
    addMessageStreaming(role, content, { stream: false });
  }

  // Show loading indicator
  function showLoading() {
    const messagesContainer = document.getElementById('chatbot-widget-messages');
    if (!messagesContainer) return;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chatbot-widget-loading chatbot-widget-message';
    loadingDiv.id = 'chatbot-widget-loading';

    const avatar = document.createElement('div');
    avatar.className = 'chatbot-widget-message-avatar';
      avatar.style.backgroundColor = botData.primaryColor || '#3B82F6';
    if (botData.avatarImage) {
      const img = document.createElement('img');
      img.src = botData.avatarImage;
      img.alt = botData.agentName;
      avatar.appendChild(img);
    } else {
      avatar.textContent = (botData.agentName || 'A').charAt(0).toUpperCase();
    }

    const dots = document.createElement('div');
    dots.className = 'chatbot-widget-loading-dots';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'chatbot-widget-loading-dot';
      dot.style.width = '6px';
      dot.style.height = '6px';
      dots.appendChild(dot);
    }

    loadingDiv.appendChild(avatar);
    loadingDiv.appendChild(dots);
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Remove loading indicator
  function removeLoading() {
    const loading = document.getElementById('chatbot-widget-loading');
    if (loading) {
      loading.remove();
    }
  }

  // Show error message
  function showError(message) {
    const messagesContainer = document.getElementById('chatbot-widget-messages');
    if (!messagesContainer) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'chatbot-widget-error';
    errorDiv.textContent = message;
    messagesContainer.appendChild(errorDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    setTimeout(() => errorDiv.remove(), 5000);
  }

  // Handle message send
  async function handleSubmit() {
    const input = document.getElementById('chatbot-widget-input');
    if (!input) return;
    
    const userMessage = input.value.trim();
    if (!userMessage || isLoading) return;
    
    // Ensure widget stays open when sending message
    ensureWidgetOpen();
    
    // Add user message
    addMessage('user', userMessage);
    input.value = '';
    isLoading = true;
    showLoading();

    try {
      // Prepare messages for API (filter out hidden messages)
      const apiMessages = messages
        .filter(msg => !msg.id || !msg.id.startsWith('hidden-info-'))
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      // Check localStorage for info request status
      if (typeof Storage !== 'undefined' && botData.id) {
        const storageKey = 'chatbot_' + botData.id + '_info_requested';
        hasRequestedInfo = localStorage.getItem(storageKey) === 'true';
      }
      
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          botId: botData.id,
          knowledgeBase: botData.knowledgeBase || '',
          agentName: botData.agentName,
          collectInfoEnabled: botData.collectInfoEnabled || false,
          collectName: botData.collectName || false,
          collectEmail: botData.collectEmail || false,
          collectPhone: botData.collectPhone || false,
          hasRequestedInfo: hasRequestedInfo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let buffer = '';

      // Add assistant message container
      const messagesContainer = document.getElementById('chatbot-widget-messages');
      removeLoading();
      
      const messageDiv = document.createElement('div');
      messageDiv.className = 'chatbot-widget-message assistant';
      
      const avatar = document.createElement('div');
      avatar.className = 'chatbot-widget-message-avatar';
      avatar.style.backgroundColor = botData.primaryColor || '#3B82F6';
      if (botData.avatarImage) {
        const img = document.createElement('img');
        img.src = botData.avatarImage;
        img.alt = botData.agentName;
        avatar.appendChild(img);
      } else {
        avatar.textContent = (botData.agentName || 'A').charAt(0).toUpperCase();
      }
      messageDiv.appendChild(avatar);
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'chatbot-widget-message-content';
      
      // Create markdown wrapper for assistant messages
      const markdownWrapper = document.createElement('div');
      markdownWrapper.className = 'markdown-content';
      contentDiv.appendChild(markdownWrapper);
      
      messageDiv.appendChild(contentDiv);
      messagesContainer.appendChild(messageDiv);

      // Process stream chunks - match useChat behavior from ai/react
      // Queue for character-by-character streaming effect
      let textQueue = '';
      let isProcessingQueue = false;

      const processQueue = async () => {
        if (isProcessingQueue || textQueue.length === 0) return;
        isProcessingQueue = true;

        while (textQueue.length > 0) {
          // Take characters from queue (process in small chunks for smooth effect)
          const chunkSize = Math.min(3, textQueue.length); // Process 3 chars at a time
          const chunk = textQueue.substring(0, chunkSize);
          textQueue = textQueue.substring(chunkSize);
          
          assistantMessage += chunk;
          
          // Update UI immediately
          const markdownWrapper = contentDiv.querySelector('.markdown-content');
          if (markdownWrapper) {
            markdownWrapper.innerHTML = markdownToHtml(assistantMessage);
          } else {
            contentDiv.innerHTML = '<div class="markdown-content">' + markdownToHtml(assistantMessage) + '</div>';
          }
          messagesContainer.scrollTop = messagesContainer.scrollHeight;

          // Small delay for streaming effect (adjust speed here)
          if (textQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 20)); // 20ms = ~50 chars/sec
          }
        }

        isProcessingQueue = false;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk immediately
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process all complete lines immediately and add to queue
        while (true) {
          const newlineIndex = buffer.indexOf('\n');
          if (newlineIndex === -1) break; // No complete line yet

          const line = buffer.substring(0, newlineIndex);
          buffer = buffer.substring(newlineIndex + 1);

          if (!line.trim()) continue;

          // Vercel AI SDK format: "0:text" where text is the content
          if (line.startsWith('0:')) {
            const text = line.substring(2);
            if (text) {
              // Add to queue for character-by-character streaming
              textQueue += text;
              // Start processing queue if not already processing
              processQueue();
            }
          }
        }
      }

      // Process any remaining buffer (final chunk without newline)
      if (buffer.trim()) {
        if (buffer.startsWith('0:')) {
          const text = buffer.substring(2);
          if (text) {
            // Add to queue for character-by-character streaming
            textQueue += text;
            processQueue();
          }
        } else if (buffer.trim() && !buffer.startsWith('event:') && !buffer.startsWith('id:')) {
          // Add to queue for character-by-character streaming
          textQueue += buffer;
          processQueue();
        }
      }
      
      // Wait for queue to finish processing all remaining text
      while (isProcessingQueue || textQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
        if (textQueue.length > 0 && !isProcessingQueue) {
          processQueue();
        }
      }

      messages.push({ role: 'assistant', content: assistantMessage });
      
      // Check if this is first user message and show info collection bubble
      setTimeout(() => {
        checkForFirstMessageInfoCollection();
        // Also check if AI asked for information in the response
        checkForInfoCollection();
      }, 100);
    } catch (error) {
      console.error('ChatbotWidget: Error sending message', error);
      console.error('ChatbotWidget: Error details:', error.message, error.stack);
      removeLoading();
      showError('Failed to send message. Please try again.');
    } finally {
      isLoading = false;
    }
  }
  
  // Check if AI asked for information and show collection form
  function checkForInfoCollection() {
    if (!botData.collectInfoEnabled || !messages.length) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant' || isLoading) return;
    
    const lastBotMessage = lastMessage.content.toLowerCase();
    let fieldToCollect = null;
    
    // Check for static messages asking for fields
    if (botData.collectName && !collectedFields.has('name') && 
        (lastBotMessage.includes('name') || lastBotMessage.includes('your name') || lastBotMessage.includes('full name'))) {
      fieldToCollect = 'name';
    } else if (botData.collectEmail && !collectedFields.has('email') && 
               (lastBotMessage.includes('email') || lastBotMessage.includes('email address') || 
                lastBotMessage.includes('what is your email'))) {
      fieldToCollect = 'email';
    } else if (botData.collectPhone && !collectedFields.has('phone') && 
               (lastBotMessage.includes('phone') || lastBotMessage.includes('phone number') || 
                lastBotMessage.includes('what is your phone'))) {
      fieldToCollect = 'phone';
    }
    
    if (fieldToCollect) {
      collectingField = fieldToCollect;
      askingMessageId = lastMessage.id || 'msg-' + (messages.length - 1);
      
      // Save to localStorage
      if (typeof Storage !== 'undefined' && botData.id && !hasRequestedInfo) {
        const storageKey = 'chatbot_' + botData.id + '_info_requested';
        localStorage.setItem(storageKey, 'true');
        hasRequestedInfo = true;
      }
      
      // Add info collection form to the message
      addInfoCollectionForm(lastMessage);
    }
  }
  
  // Show info collection bubble after AI responds to first user message
  function checkForFirstMessageInfoCollection() {
    if (!botData.collectInfoEnabled || hasRequestedInfo || collectingField || showInfoCollectionBubble || infoBubbleCreated) return;
    if (!messages.length || isLoading) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;
    
    // Check if this is after the first user message
    // FIX: Correct operator precedence - need parentheses
    const userMessages = messages.filter(m => m.role === 'user' && (!m.id || !m.id.startsWith('hidden-info-')));
    const hasInfoBubble = messages.some(m => m.id && m.id.startsWith('info-collection-'));
    
    if (userMessages.length === 1 && !hasInfoBubble) {
      let firstField = null;
      if (botData.collectName) {
        firstField = 'name';
      } else if (botData.collectEmail) {
        firstField = 'email';
      } else if (botData.collectPhone) {
        firstField = 'phone';
      }
      
      if (firstField) {
        infoBubbleCreated = true;
        showInfoCollectionBubble = true;
        collectingField = firstField;
        
        let staticMessage = '';
        if (firstField === 'name') {
          staticMessage = 'To better assist you, could I please have your full name?';
        } else if (firstField === 'email') {
          staticMessage = 'To better assist you, could I please have your email address?';
        } else if (firstField === 'phone') {
          staticMessage = 'To better assist you, could I please have your phone number?';
        }
        
        const infoBubbleMessage = {
          id: 'info-collection-' + Date.now(),
          role: 'assistant',
          content: staticMessage,
        };
        
        addMessageStreaming('assistant', staticMessage, { id: infoBubbleMessage.id });
        askingMessageId = infoBubbleMessage.id;
        
        // Save to localStorage
        if (typeof Storage !== 'undefined' && botData.id) {
          const storageKey = 'chatbot_' + botData.id + '_info_requested';
          localStorage.setItem(storageKey, 'true');
          hasRequestedInfo = true;
        }
        
        // Add form to the message - increase timeout to ensure DOM is ready
        setTimeout(() => {
          const messageElements = document.querySelectorAll('.chatbot-widget-message.assistant');
          if (messageElements.length > 0) {
            // Find the message with the matching ID
            let targetMessage = null;
            for (let i = messageElements.length - 1; i >= 0; i--) {
              const msgEl = messageElements[i];
              const msgId = msgEl.getAttribute('data-message-id');
              if (msgId === infoBubbleMessage.id) {
                targetMessage = msgEl;
                break;
              }
            }
            // Fallback to last message if ID not found
            if (!targetMessage) {
              targetMessage = messageElements[messageElements.length - 1];
            }
            if (targetMessage) {
              addInfoCollectionForm({ id: infoBubbleMessage.id }, targetMessage);
            }
          }
        }, 200); // Increased timeout to 200ms for better reliability
      }
    }
  }
  
  // Add info collection form to a message
  function addInfoCollectionForm(message, messageElement) {
    if (!collectingField) return;
    
    // Find the message element if not provided
    if (!messageElement) {
      const messagesContainer = document.getElementById('chatbot-widget-messages');
      if (!messagesContainer) return;
      
      const allMessages = messagesContainer.querySelectorAll('.chatbot-widget-message.assistant');
      messageElement = allMessages[allMessages.length - 1];
      if (!messageElement) return;
    }
    
    // Check if form already exists
    if (messageElement.querySelector('.chatbot-widget-info-form')) return;
    
    const contentDiv = messageElement.querySelector('.chatbot-widget-message-content');
    if (!contentDiv) return;
    
    const formDiv = document.createElement('div');
    formDiv.className = 'chatbot-widget-info-form';
    
    const input = document.createElement('input');
    input.type = collectingField === 'email' ? 'email' : (collectingField === 'phone' ? 'tel' : 'text');
    input.className = 'chatbot-widget-info-form-input';
    input.placeholder = collectingField === 'name' ? 'e.g. John Doe' : 
                       (collectingField === 'email' ? 'name@example.com' : '+1 (555) 000-0000');
    input.autofocus = true;
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'chatbot-widget-info-form-buttons';
    
    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'chatbot-widget-info-form-skip-btn';
    skipBtn.textContent = 'Skip';
    skipBtn.onclick = function() {
      handleInfoSubmit(collectingField, '', true);
    };
    
    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'chatbot-widget-info-form-send-btn';
    sendBtn.textContent = 'Send';
    sendBtn.onclick = function() {
      const value = input.value.trim();
      if (value) {
        handleInfoSubmit(collectingField, value, false);
      }
    };
    
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = input.value.trim();
        if (value) {
          handleInfoSubmit(collectingField, value, false);
        }
      }
    });
    
    buttonsDiv.appendChild(skipBtn);
    buttonsDiv.appendChild(sendBtn);
    
    formDiv.appendChild(input);
    formDiv.appendChild(buttonsDiv);
    
    contentDiv.appendChild(formDiv);
    
    // Disable main input
    const mainInput = document.getElementById('chatbot-widget-input');
    if (mainInput) {
      mainInput.disabled = true;
      mainInput.placeholder = 'Please provide your information above...'; // Static placeholder when collecting info
    }
  }
  
  // Handle info submission
  function handleInfoSubmit(field, value, skipped) {
    if (!skipped && !value.trim()) return;
    
    // Store collected information
    if (!skipped) {
      collectedInfo[field] = value;
    }
    collectedFields.add(field);
    
    // Build queue of remaining fields
    const fieldsQueue = [];
    if (botData.collectName && !collectedFields.has('name')) {
      fieldsQueue.push('name');
    }
    if (botData.collectEmail && !collectedFields.has('email')) {
      fieldsQueue.push('email');
    }
    if (botData.collectPhone && !collectedFields.has('phone')) {
      fieldsQueue.push('phone');
    }
    
    const nextField = fieldsQueue[0];
    
    // Update the message bubble
    const messagesContainer = document.getElementById('chatbot-widget-messages');
    if (messagesContainer) {
      const allMessages = messagesContainer.querySelectorAll('.chatbot-widget-message.assistant');
      const lastMsgEl = allMessages[allMessages.length - 1];
      if (lastMsgEl) {
        const contentDiv = lastMsgEl.querySelector('.chatbot-widget-message-content');
        if (contentDiv) {
          // Remove form
          const form = contentDiv.querySelector('.chatbot-widget-info-form');
          if (form) form.remove();
          
          // Update message content
          let newContent = '';
          if (field === 'name' && !skipped) {
            newContent = 'Thank you, ' + value + '!';
          } else {
            newContent = 'Thank you!';
          }
          
          if (nextField) {
            let nextFieldMessage = '';
            if (nextField === 'email') {
              nextFieldMessage = 'What is your email address?';
            } else if (nextField === 'phone') {
              nextFieldMessage = 'What is your phone number?';
            }
            if (nextFieldMessage) {
              newContent += ' ' + nextFieldMessage;
            }
          }
          
          // Update content
          const markdownDiv = contentDiv.querySelector('.markdown-content');
          if (markdownDiv) {
            markdownDiv.textContent = newContent;
          } else {
            contentDiv.querySelector('span, p')?.remove();
            const newText = document.createElement('span');
            newText.textContent = newContent;
            contentDiv.appendChild(newText);
          }
          
          // Update message in array
          const msgIndex = messages.findIndex(m => m.id === askingMessageId);
          if (msgIndex !== -1) {
            messages[msgIndex].content = newContent;
          }
          
          // Show next field form
          if (nextField) {
            collectingField = nextField;
            askingMessageId = messages[msgIndex]?.id || askingMessageId;
            setTimeout(() => {
              addInfoCollectionForm({ id: askingMessageId }, lastMsgEl);
            }, 100);
          } else {
            // All fields collected - send to AI
            collectingField = null;
            askingMessageId = null;
            showInfoCollectionBubble = false;
            
            // Remove the bubble
            lastMsgEl.remove();
            messages = messages.filter(m => m.id !== askingMessageId);
            
            // Send collected info to AI
            sendCollectedInfoToAI();
          }
        }
      }
    }
    
    // Re-enable main input if no more fields
    if (!nextField) {
      const mainInput = document.getElementById('chatbot-widget-input');
      if (mainInput) {
        mainInput.disabled = false;
        mainInput.placeholder = botData.inputPlaceholder || 'Type a message...';
      }
    }
  }
  
  // Send collected info to AI silently
  function sendCollectedInfoToAI() {
    const infoParts = [];
    if (collectedInfo.name) {
      infoParts.push('Name: ' + collectedInfo.name);
    }
    if (collectedInfo.email) {
      infoParts.push('Email: ' + collectedInfo.email);
    }
    if (collectedInfo.phone) {
      infoParts.push('Phone: ' + collectedInfo.phone);
    }
    
    const summaryMessage = 'I\'ve provided my information:\n' + infoParts.join('\n');
    
    // Add hidden message to array (won't be rendered)
    const hiddenMessage = {
      id: 'hidden-info-' + Date.now(),
      role: 'user',
      content: summaryMessage,
    };
    messages.push(hiddenMessage);
    
    // Send to API directly without showing in UI
    sendInfoToAPI(summaryMessage);
    
    // Clear collected info
    collectedInfo = {};
    collectedFields = new Set();
  }
  
  // Send info to API without showing in UI
  async function sendInfoToAPI(messageContent) {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    
    try {
      // Prepare messages for API (include hidden message)
      const apiMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          botId: botData.id,
          knowledgeBase: botData.knowledgeBase || '',
          agentName: botData.agentName,
          collectInfoEnabled: botData.collectInfoEnabled || false,
          collectName: botData.collectName || false,
          collectEmail: botData.collectEmail || false,
          collectPhone: botData.collectPhone || false,
          hasRequestedInfo: hasRequestedInfo,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      // Handle streaming response (same as handleSubmit)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let buffer = '';
      
      const messagesContainer = document.getElementById('chatbot-widget-messages');
      if (!messagesContainer) {
        console.error('ChatbotWidget: Messages container not found');
        removeLoading();
        isLoading = false;
        return;
      }
      
      removeLoading();
      
      const messageDiv = document.createElement('div');
      messageDiv.className = 'chatbot-widget-message assistant';
      
      const avatar = document.createElement('div');
      avatar.className = 'chatbot-widget-message-avatar';
      avatar.style.backgroundColor = botData.primaryColor || '#3B82F6';
      if (botData.avatarImage) {
        const img = document.createElement('img');
        img.src = botData.avatarImage;
        img.alt = botData.agentName;
        avatar.appendChild(img);
      } else {
        avatar.textContent = (botData.agentName || 'A').charAt(0).toUpperCase();
      }
      messageDiv.appendChild(avatar);
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'chatbot-widget-message-content';
      
      const markdownWrapper = document.createElement('div');
      markdownWrapper.className = 'markdown-content';
      contentDiv.appendChild(markdownWrapper);
      
      messageDiv.appendChild(contentDiv);
      messagesContainer.appendChild(messageDiv);
      
      // Ensure messages container is visible
      updateWelcomeScreen();
      
      // Process stream (same logic as handleSubmit)
      let textQueue = '';
      let isProcessingQueue = false;
      
      // Store reference to markdownWrapper in closure
      const markdownWrapperRef = markdownWrapper;
      const messagesContainerRef = messagesContainer;
      
      const processQueue = async () => {
        if (isProcessingQueue || textQueue.length === 0) return;
        isProcessingQueue = true;
        
        while (textQueue.length > 0) {
          const chunkSize = Math.min(3, textQueue.length);
          const chunk = textQueue.substring(0, chunkSize);
          textQueue = textQueue.substring(chunkSize);
          assistantMessage += chunk;
          
          if (markdownWrapperRef) {
            markdownWrapperRef.innerHTML = markdownToHtml(assistantMessage);
          }
          if (messagesContainerRef) {
            messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
          }
          
          if (textQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
        
        isProcessingQueue = false;
      };
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Debug: Log buffer to understand format (only first time)
        if (buffer.length > 0 && buffer.length < 500 && !buffer.includes('\n')) {
          console.log('ChatbotWidget: First chunk (no newline yet):', JSON.stringify(buffer.substring(0, 200)));
        }
        
        while (true) {
          const newlineIndex = buffer.indexOf('\n');
          if (newlineIndex === -1) break;
          
          const line = buffer.substring(0, newlineIndex);
          buffer = buffer.substring(newlineIndex + 1);
          
          if (!line.trim()) continue;
          
          // Handle Vercel AI SDK format: "0:text"
          if (line.startsWith('0:')) {
            const text = line.substring(2);
            if (text) {
              textQueue += text;
              processQueue();
            }
          } else if (line.startsWith('data:')) {
            // Handle Server-Sent Events format: "data: text"
            const text = line.substring(5).trim();
            if (text && text !== '[DONE]') {
              // Try to parse as JSON, if not, use as plain text
              try {
                const parsed = JSON.parse(text);
                if (parsed && parsed.content) {
                  textQueue += parsed.content;
                  processQueue();
                }
              } catch (e) {
                // Not JSON, use as plain text
                textQueue += text;
                processQueue();
              }
            }
          } else if (!line.startsWith('event:') && !line.startsWith('id:') && !line.startsWith(':')) {
            // Handle plain text format (direct text response)
            // This catches any text that doesn't match known formats
            console.log('ChatbotWidget: Processing plain text line:', line.substring(0, 50));
            textQueue += line;
            processQueue();
          }
        }
      }
      
      // Process remaining buffer
      if (buffer.trim()) {
        console.log('ChatbotWidget: Processing remaining buffer:', JSON.stringify(buffer.substring(0, 200)));
        if (buffer.startsWith('0:')) {
          const text = buffer.substring(2);
          if (text) {
            textQueue += text;
            processQueue();
          }
        } else if (buffer.startsWith('data:')) {
          const text = buffer.substring(5).trim();
          if (text && text !== '[DONE]') {
            try {
              const parsed = JSON.parse(text);
              if (parsed && parsed.content) {
                textQueue += parsed.content;
                processQueue();
              } else if (typeof parsed === 'string') {
                textQueue += parsed;
                processQueue();
              }
            } catch (e) {
              textQueue += text;
              processQueue();
            }
          }
        } else if (!buffer.startsWith('event:') && !buffer.startsWith('id:') && !buffer.startsWith(':')) {
          // Handle plain text format - this is important for responses that come as plain text
          console.log('ChatbotWidget: Adding remaining buffer as plain text:', buffer.substring(0, 100));
          textQueue += buffer;
          processQueue();
        }
      }
      
      // Debug: Log final state
      console.log('ChatbotWidget: Finished processing stream. Assistant message length:', assistantMessage.length, 'Text queue length:', textQueue.length);
      
      while (isProcessingQueue || textQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
        if (textQueue.length > 0 && !isProcessingQueue) {
          processQueue();
        }
      }
      
      // Ensure final markdown conversion after all streaming is complete
      if (assistantMessage && assistantMessage.trim() && markdownWrapperRef) {
        markdownWrapperRef.innerHTML = markdownToHtml(assistantMessage);
        if (messagesContainerRef) {
          messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
        }
        console.log('ChatbotWidget: Final assistant message after info collection:', assistantMessage);
      }
      
      // Only add message if it has content
      if (assistantMessage && assistantMessage.trim()) {
        messages.push({ role: 'assistant', content: assistantMessage });
        console.log('ChatbotWidget: Successfully added assistant message to array. Length:', assistantMessage.length);
      } else {
        console.warn('ChatbotWidget: Empty assistant message received after info collection');
        console.warn('ChatbotWidget: Buffer remaining:', buffer);
        console.warn('ChatbotWidget: AssistantMessage value:', assistantMessage);
        console.warn('ChatbotWidget: TextQueue remaining:', textQueue);
        // Remove the empty message div
        if (messageDiv && messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }
    } catch (error) {
      console.error('ChatbotWidget: Error sending info', error);
      removeLoading();
      showError('Failed to send information. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  // Handle refresh
  function handleRefresh() {
    const messagesContainer = document.getElementById('chatbot-widget-messages');
    const input = document.getElementById('chatbot-widget-input');
    
    if (messagesContainer) {
      // Clear streaming timeout if active
      if (streamingWelcomeTimeout) {
        clearTimeout(streamingWelcomeTimeout);
        streamingWelcomeTimeout = null;
      }
      
      // Reset streaming state
      isStreamingWelcome = false;
      welcomeMessageShown = false; // Reset flag so it can be shown again
      
      // Remove all message elements
      const messageElements = messagesContainer.querySelectorAll('.chatbot-widget-message, #chatbot-widget-loading');
      messageElements.forEach(el => el.remove());
      
      // Reset messages array
      messages = [];
      
      // Keep input focused to stay in conversation view (don't reset isInputFocused)
      // This matches live-preview.tsx behavior
      if (!isInputFocused) {
        isInputFocused = true;
      }
      
      // Clear input field
      if (input) {
        input.value = '';
      }
      
      // Ensure conversation view stays open
      updateWelcomeScreen();
      
      // Trigger re-streaming of welcome message
      // This will happen automatically when isInputFocused is true and messages are empty
      startStreamingWelcome();
    }
  }

  // Get icon SVG based on widgetIcon type
  function getIconSVG(iconType) {
    const iconMap = {
      'message-circle': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
      'bot': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>',
      'sparkles': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>',
      'help-circle': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>'
    };
    return iconMap[iconType] || iconMap['message-circle']; // Default to message-circle
  }

  // Update button icon based on widget state
  function updateButtonIcon() {
    const button = document.getElementById('chatbot-widget-toggle-button');
    if (!button) return;
    
    if (isOpen) {
      // X icon when open
      button.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      // Use selected widget icon when closed
      const iconType = botData?.widgetIcon || 'message-circle';
      button.innerHTML = getIconSVG(iconType);
    }
  }

  // Toggle widget
  function toggleWidget() {
    isOpen = !isOpen;
    const window = document.querySelector('.chatbot-widget-window');
    if (window) {
      if (isOpen) {
        window.classList.add('open');
        // Show static welcome message initially (if input not focused)
        if (!isInputFocused) {
          updateWelcomeScreen();
        }
      } else {
        window.classList.remove('open');
      }
    }
    // Update button icon
    updateButtonIcon();
  }
  
  // Ensure widget stays open (prevent accidental closing)
  function ensureWidgetOpen() {
    if (!isOpen) {
      isOpen = true;
      const window = document.querySelector('.chatbot-widget-window');
      if (window) {
        window.classList.add('open');
      }
      updateButtonIcon();
      // Show static welcome message initially (if input not focused)
      if (!isInputFocused) {
        updateWelcomeScreen();
      }
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBotData);
  } else {
    loadBotData();
  }

  // Export for external access
  window.ChatbotWidget = {
    toggle: toggleWidget,
    open: function() { if (!isOpen) toggleWidget(); },
    close: function() { if (isOpen) toggleWidget(); },
  };
})();

