(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.ChatbotWidget) {
    return;
  }

  // Get configuration from window
  const config = window.chatbotConfig || {};
  const botId = config.id;
  const apiBaseUrl = config.apiUrl || window.location.origin;

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
    const primaryColor = botData.primaryColor || '#3b82f6';
    const primaryColorRgba = hexToRgba(primaryColor, 0.25);

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      .chatbot-widget-container {
        position: fixed;
        ${position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
        bottom: 24px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
        padding: 12px;
        border-top: 1px solid #e5e7eb;
        background: white;
      }
      .chatbot-widget-input-form {
        display: flex;
        gap: 8px;
      }
      .chatbot-widget-input {
        flex: 1;
        border: none;
        background: #f9fafb;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        outline: none;
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
        font-size: 10px;
        color: #9ca3af;
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
      .chatbot-widget-static-welcome {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        padding: 48px 24px;
      }
      .chatbot-widget-static-welcome-icon {
        width: 64px;
        height: 64px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }
      .chatbot-widget-static-welcome-icon svg {
        width: 32px;
        height: 32px;
      }
      .chatbot-widget-static-welcome h3 {
        font-size: 20px;
        font-weight: bold;
        color: #111827;
        margin: 0 0 8px 0;
      }
      .chatbot-widget-static-welcome p {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 24px 0;
        max-width: 280px;
      }
      .chatbot-widget-static-welcome .hint {
        font-size: 12px;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
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

    // Messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chatbot-widget-messages';
    messagesContainer.id = 'chatbot-widget-messages';
    
    // Static welcome message container
    const staticWelcome = document.createElement('div');
    staticWelcome.className = 'chatbot-widget-static-welcome';
    staticWelcome.id = 'chatbot-widget-static-welcome';
    staticWelcome.style.display = 'none';
    
    const welcomeIcon = document.createElement('div');
    welcomeIcon.className = 'chatbot-widget-static-welcome-icon';
    const primaryColorRgba = hexToRgba(botData.primaryColor || '#3b82f6', 0.15);
    welcomeIcon.style.backgroundColor = primaryColorRgba;
    welcomeIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: ' + (botData.primaryColor || '#3b82f6') + ';"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
    
    const welcomeTitle = document.createElement('h3');
    welcomeTitle.textContent = getWelcomeMessage() || 'How can we help?';
    
    const welcomeDesc = document.createElement('p');
    welcomeDesc.textContent = 'Ask ' + (botData.agentName || 'us') + ' anything about our products, pricing, or support services.';
    
    const welcomeHint = document.createElement('p');
    welcomeHint.className = 'hint';
    welcomeHint.textContent = 'Start typing below';
    
    staticWelcome.appendChild(welcomeIcon);
    staticWelcome.appendChild(welcomeTitle);
    staticWelcome.appendChild(welcomeDesc);
    staticWelcome.appendChild(welcomeHint);
    
    messagesContainer.appendChild(staticWelcome);

    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'chatbot-widget-input-container';
    
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
      updateStaticWelcome();
      startStreamingWelcome();
    });
    input.addEventListener('blur', function() {
      isInputFocused = false;
      updateStaticWelcome();
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
    
    // Add footer with "Powered by Proweaver"
    const footer = document.createElement('div');
    footer.className = 'chatbot-widget-footer';
    const footerIcon = document.createElement('span');
    footerIcon.className = 'chatbot-widget-footer-icon';
    // Sparkles icon SVG (from lucide-react)
    footerIcon.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>';
    const footerText = document.createElement('p');
    footerText.className = 'chatbot-widget-footer-text';
    footerText.textContent = 'Powered by Proweaver';
    footer.appendChild(footerIcon);
    footer.appendChild(footerText);
    
    inputContainer.appendChild(inputWrapper);
    inputContainer.appendChild(footer);

    window.appendChild(header);
    window.appendChild(messagesContainer);
    window.appendChild(inputContainer);

    return window;
  }

  // Update static welcome message visibility
  function updateStaticWelcome() {
    const staticWelcome = document.getElementById('chatbot-widget-static-welcome');
    if (!staticWelcome) return;
    
    const hasOnlyEmptyWelcome = messages.length === 0 || 
      (messages.length === 1 && messages[0].role === 'assistant' && (!messages[0].content || messages[0].content === ''));
    
    if (!isInputFocused && hasOnlyEmptyWelcome && !isStreamingWelcome) {
      staticWelcome.style.display = 'flex';
      // Update welcome message text if it changed
      const welcomeTitle = staticWelcome.querySelector('h3');
      if (welcomeTitle) {
        welcomeTitle.textContent = getWelcomeMessage() || 'How can we help?';
      }
    } else {
      staticWelcome.style.display = 'none';
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
    updateStaticWelcome();
    
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
    avatar.style.backgroundColor = botData.primaryColor || '#3b82f6';
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
        updateStaticWelcome();
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
    updateStaticWelcome();

    const { stream = false, speed = 30 } = options;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-widget-message ${role}`;

    if (role === 'assistant') {
      const avatar = document.createElement('div');
      avatar.className = 'chatbot-widget-message-avatar';
      avatar.style.backgroundColor = botData.primaryColor || '#3b82f6';
      
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
      messages.push({ role, content });
    }
    
    messageDiv.appendChild(contentDiv);

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    updateStaticWelcome();
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
    avatar.style.backgroundColor = botData.primaryColor || '#3b82f6';
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
      // Prepare messages for API
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
      avatar.style.backgroundColor = botData.primaryColor || '#3b82f6';
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
    } catch (error) {
      console.error('ChatbotWidget: Error sending message', error);
      console.error('ChatbotWidget: Error details:', error.message, error.stack);
      removeLoading();
      showError('Failed to send message. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  // Handle refresh
  function handleRefresh() {
    const messagesContainer = document.getElementById('chatbot-widget-messages');
    if (messagesContainer) {
      // Clear streaming timeout if active
      if (streamingWelcomeTimeout) {
        clearTimeout(streamingWelcomeTimeout);
        streamingWelcomeTimeout = null;
      }
      // Remove all message elements (but keep static welcome)
      const messageElements = messagesContainer.querySelectorAll('.chatbot-widget-message, #chatbot-widget-loading');
      messageElements.forEach(el => el.remove());
      messages = [];
      welcomeMessageShown = false; // Reset flag so it can be shown again
      isInputFocused = false;
      isStreamingWelcome = false;
      updateStaticWelcome();
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
          updateStaticWelcome();
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
        updateStaticWelcome();
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

