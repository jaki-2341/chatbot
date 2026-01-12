import {
  ContextChatEngine,
  LLM,
  serviceContextFromDefaults,
  SimpleDocumentStore,
  storageContextFromDefaults,
  VectorStoreIndex,
  Document,
  SimpleDirectoryReader,
} from "llamaindex";
import { CHUNK_OVERLAP, CHUNK_SIZE, STORAGE_CACHE_DIR, STORAGE_DIR } from "./constants.mjs";
import * as fs from "fs";
import * as path from "path";

/**
 * Get the set of file paths that are already indexed in the document store
 */
async function getIndexedFilePaths(botId?: string): Promise<Set<string>> {
  const cacheDir = botId ? `${STORAGE_CACHE_DIR}/${botId}` : STORAGE_CACHE_DIR;
  
  if (!fs.existsSync(cacheDir)) {
    return new Set();
  }

  try {
    const storageContext = await storageContextFromDefaults({
      persistDir: cacheDir,
    });
    
    const docStore = storageContext.docStore as SimpleDocumentStore;
    const docDict = docStore.toDict();
    const indexedPaths = new Set<string>();
    
    // Extract file paths from document metadata
    for (const [docId, doc] of Object.entries(docDict)) {
      if (doc.metadata && doc.metadata.file_path) {
        // Normalize the path for comparison
        const normalizedPath = path.normalize(doc.metadata.file_path);
        indexedPaths.add(normalizedPath);
      }
      // Also check for file_name in metadata (alternative metadata key)
      if (doc.metadata && doc.metadata.file_name) {
        const dataDir = botId ? path.join(STORAGE_DIR, botId) : STORAGE_DIR;
        const fullPath = path.join(dataDir, doc.metadata.file_name);
        const normalizedPath = path.normalize(fullPath);
        indexedPaths.add(normalizedPath);
      }
    }
    
    return indexedPaths;
  } catch (error) {
    console.error('Error getting indexed file paths:', error);
    return new Set();
  }
}

/**
 * Filter documents to only include new ones that haven't been indexed yet
 */
async function filterNewDocuments(documents: Document[], botId?: string): Promise<Document[]> {
  if (documents.length === 0) {
    return [];
  }

  const indexedPaths = await getIndexedFilePaths(botId);
  const newDocuments: Document[] = [];
  
  for (const doc of documents) {
    let isNew = true;
    
    // Check if document has file_path in metadata
    if (doc.metadata && doc.metadata.file_path) {
      const normalizedPath = path.normalize(doc.metadata.file_path);
      if (indexedPaths.has(normalizedPath)) {
        isNew = false;
      }
    }
    
    // Also check file_name
    if (doc.metadata && doc.metadata.file_name) {
      const dataDir = botId ? path.join(STORAGE_DIR, botId) : STORAGE_DIR;
      const fullPath = path.join(dataDir, doc.metadata.file_name);
      const normalizedPath = path.normalize(fullPath);
      if (indexedPaths.has(normalizedPath)) {
        isNew = false;
      }
    }
    
    // If no metadata, check by document hash (fallback)
    if (isNew && indexedPaths.size > 0) {
      // For documents without file metadata, we'll include them
      // The hash-based deduplication in buildIndexFromNodes will handle duplicates
      isNew = true;
    }
    
    if (isNew) {
      newDocuments.push(doc);
    }
  }
  
  return newDocuments;
}

/**
 * Add new documents incrementally to an existing index
 */
async function addDocumentsToIndex(
  index: VectorStoreIndex,
  documents: Document[],
  llm: LLM
): Promise<void> {
  if (documents.length === 0) {
    return;
  }

  const serviceContext = serviceContextFromDefaults({
    llm,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  // Parse documents into nodes
  const nodes = serviceContext.nodeParser.getNodesFromDocuments(documents);
  
  // Insert nodes incrementally (this will skip duplicates based on hash)
  await index.insertNodes(nodes);
}

async function getDataSource(llm: LLM, botId?: string) {
  const serviceContext = serviceContextFromDefaults({
    llm,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  
  // Use bot-specific cache directory if botId is provided
  const cacheDir = botId ? `${STORAGE_CACHE_DIR}/${botId}` : STORAGE_CACHE_DIR;
  
  let storageContext = await storageContextFromDefaults({
    persistDir: cacheDir,
  });

  const numberOfDocs = Object.keys(
    (storageContext.docStore as SimpleDocumentStore).toDict(),
  ).length;
  if (numberOfDocs === 0) {
    throw new Error(
      `StorageContext is empty - call 'npm run generate' to generate the storage first`,
    );
  }
  return await VectorStoreIndex.init({
    storageContext,
    serviceContext,
  });
}

async function createTextBasedIndex(llm: LLM, botId?: string, agentName?: string) {
  const serviceContext = serviceContextFromDefaults({
    llm,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  // Use bot-specific cache directory if botId is provided
  const cacheDir = botId ? `${STORAGE_CACHE_DIR}/${botId}` : STORAGE_CACHE_DIR;
  
  // Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    await fs.promises.mkdir(cacheDir, { recursive: true });
  }

  // Create storage context for persistence
  const storageContext = await storageContextFromDefaults({
    persistDir: cacheDir,
  });

  // Create a minimal document for agent context if agent name is provided
  // This ensures we have an index structure, but knowledge base is NOT indexed
  let documents: Document[] = [];
  if (agentName) {
    const agentContext = new Document({ 
      text: `You are ${agentName}, a helpful customer support agent.`,
      metadata: { source: 'agent_context', type: 'instruction' }
    });
    documents.push(agentContext);
  }
  
  // If no documents, create a minimal placeholder to ensure index structure exists
  if (documents.length === 0) {
    const placeholderDoc = new Document({ 
      text: 'Chatbot ready.',
      metadata: { source: 'system', type: 'placeholder' }
    });
    documents.push(placeholderDoc);
  }
  
  // Create index with storage context (will persist automatically)
  const index = await VectorStoreIndex.fromDocuments(documents, { 
    serviceContext,
    storageContext, // This makes it persist!
  });
  
  return index;
}

async function loadDocumentsFromDirectory(botId?: string): Promise<Document[]> {
  // Determine the directory path
  const dataDir = botId ? path.join(STORAGE_DIR, botId) : STORAGE_DIR;
  
  // Check if directory exists
  if (!fs.existsSync(dataDir)) {
    return [];
  }

  try {
    // Load documents from the directory
    const reader = new SimpleDirectoryReader();
    const documents = await reader.loadData({
      directoryPath: dataDir,
    });
    return documents;
  } catch (error) {
    console.error(`Error loading documents from ${dataDir}:`, error);
    return [];
  }
}

async function createCombinedIndex(llm: LLM, botId?: string, agentName?: string) {
  const serviceContext = serviceContextFromDefaults({
    llm,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  // Use bot-specific cache directory if botId is provided
  const cacheDir = botId ? `${STORAGE_CACHE_DIR}/${botId}` : STORAGE_CACHE_DIR;
  
  // Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    await fs.promises.mkdir(cacheDir, { recursive: true });
  }

  // Create storage context for persistence
  const storageContext = await storageContextFromDefaults({
    persistDir: cacheDir,
  });

  // Load documents from directory (PDF files as additional resources)
  // Knowledge base is NOT indexed - it's only used as instructions
  const fileDocuments = await loadDocumentsFromDirectory(botId);
  
  // Combine documents: Agent context (if provided) + PDF files
  // Knowledge base is NOT included in the index
  let allDocuments: Document[] = [];
  
  if (agentName) {
    const agentContext = new Document({ 
      text: `You are ${agentName}, a helpful customer support agent.`,
      metadata: { source: 'agent_context', type: 'instruction' }
    });
    allDocuments.push(agentContext);
  }
  
  allDocuments.push(...fileDocuments);
  
  if (allDocuments.length === 0) {
    // If no documents, create a minimal placeholder
    const placeholderDoc = new Document({ 
      text: 'Chatbot ready.',
      metadata: { source: 'system', type: 'placeholder' }
    });
    allDocuments.push(placeholderDoc);
  }

  // Create index from documents with storage context (will persist automatically)
  // Note: Knowledge base is NOT indexed - it's passed as instructions separately
  const index = await VectorStoreIndex.fromDocuments(allDocuments, { 
    serviceContext,
    storageContext, // This makes it persist!
  });
  
  return index;
}

export async function createChatEngine(
  llm: LLM, 
  botId?: string, 
  knowledgeBase?: string, 
  agentName?: string,
  collectInfoEnabled?: boolean,
  collectName?: boolean,
  collectEmail?: boolean,
  collectPhone?: boolean,
  isFirstUserMessage?: boolean,
  hasRequestedInfo?: boolean
) {
  const hasKnowledgeBase = knowledgeBase && knowledgeBase.trim();
  
  // Build base system prompt
  let baseSystemPrompt = '';
  if (agentName) {
    baseSystemPrompt = `You are ${agentName}, a helpful customer support agent.`;
  } else {
    baseSystemPrompt = `You are a helpful customer support agent.`;
  }
  
  if (hasKnowledgeBase) {
    baseSystemPrompt += ` ${knowledgeBase}`;
  }
  
  // Note: Information collection is now handled separately in the UI
  // The AI should respond normally to the first message without asking for information
  
  // Add instruction for handling user information when it's provided
  if (collectInfoEnabled) {
    baseSystemPrompt += `\n\nCRITICAL - USER INFORMATION HANDLING: When you receive a message that says "I've provided my information:" followed by Name, Email, or Phone, this means the user has completed a form. DO NOT repeat back their information. DO NOT say "Thank you for providing your name, [name]" or list what they provided. 

Respond warmly and naturally with ONE brief, friendly sentence that acknowledges them and invites them to continue. Make it feel personal and welcoming. Examples of good responses:
- "Wonderful! I'm here to help. What can I do for you today?"
- "Perfect! I'm ready to assist you. How can I help?"
- "Excellent! I'd be happy to help. What would you like to know?"
- "Thank you! I'm here for you. What can I assist you with today?"
- "Great to have that information! How can I be of service?"

Keep it warm, friendly, and conversational. Immediately transition to asking how you can help. Never mention their name, email, or phone number in your response.`;
  }
  
  // Add contextual response instructions based on conversation state
  if (isFirstUserMessage && !hasRequestedInfo) {
    // First message and info not requested yet: Answer directly without generic follow-ups
    baseSystemPrompt += `\n\nCRITICAL - FIRST MESSAGE RESPONSE: This is the user's first message. Provide a direct, helpful answer to their question or request. DO NOT add generic follow-up questions like "How can I help you?" or "What can I do for you?" at the end. Focus solely on answering their question completely and accurately.`;
  } else if (hasRequestedInfo) {
    // Info has been requested (localStorage flag is true): Include a follow-up question
    baseSystemPrompt += `\n\nCRITICAL - CONVERSATION CONTINUITY: After providing your answer, include a contextual follow-up question to keep the conversation engaging. Examples:
- If they asked about a specific topic: "Do you have any more questions about [topic]?"
- If they asked about services: "Would you like to know more about any of our services?"
- If they asked a general question: "Is there anything else I can help you with?"
- If continuing a previous topic: "Would you like me to elaborate on [previous topic]?"

Keep the follow-up relevant to the conversation context. Make it feel natural and conversational.`;
  } else {
    // Subsequent messages (not first, and info not requested): Maintain context and ask topic-specific follow-ups
    baseSystemPrompt += `\n\nCRITICAL - CONVERSATION CONTINUITY: Maintain context from previous messages. When the user asks a new question or continues the conversation:
1. Answer their question directly and completely
2. Reference previous conversation topics when relevant
3. Ask a topic-specific follow-up question related to what was just discussed, such as:
   - "Do you have any more questions about [current topic]?"
   - "Would you like me to explain more about [related aspect]?"
   - "Is there anything specific about [topic] you'd like to know?"

Avoid generic questions like "How can I help you?" Instead, ask questions that show you're following the conversation and understand the context.`;
  }
  
  // Check if documents exist for this bot
  const fileDocuments = await loadDocumentsFromDirectory(botId);
  const hasDocuments = fileDocuments.length > 0;
  
  // If no documents, don't create any cache/index - just use knowledge base as instructions
  if (!hasDocuments) {
    // Clean up any existing cache directory since there are no documents
    if (botId) {
      const cacheDir = `${STORAGE_CACHE_DIR}/${botId}`;
      if (fs.existsSync(cacheDir)) {
        try {
          const { rm } = await import('fs/promises');
          await rm(cacheDir, { recursive: true, force: true });
          console.log(`Cleaned up cache directory for bot ${botId} - no documents to index`);
        } catch (error) {
          console.error(`Error cleaning up cache directory for bot ${botId}:`, error);
        }
      }
    }
    
    // No PDF files - return a simple chat engine without RAG
    // Knowledge base will be passed as system message in the chat route
    // Create a minimal in-memory index that doesn't persist
    const serviceContext = serviceContextFromDefaults({
      llm,
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });

    // Create a minimal placeholder document for the index structure (in-memory only)
    const placeholderDoc = new Document({ 
      text: 'No additional resources available.',
      metadata: { source: 'system', type: 'placeholder' }
    });

    // Create index WITHOUT storage context (in-memory only, won't persist)
    const index = await VectorStoreIndex.fromDocuments([placeholderDoc], { 
      serviceContext,
      // No storageContext - this means it won't create cache files!
    });
    
    const retriever = index.asRetriever();
    retriever.similarityTopK = 0; // Don't retrieve anything since there are no documents
    
    return new ContextChatEngine({
      chatModel: llm,
      retriever,
      contextSystemPrompt: ({ context }) => {
        return `${baseSystemPrompt}\n\nContext from knowledge base:\n${context || 'No additional context available.'}`;
      },
    });
  }
  
  // We have documents - proceed with creating/updating index
  // Try to load from existing index (for pre-indexed documents)
  let index: VectorStoreIndex | null = null;
  try {
    index = await getDataSource(llm, botId);
  } catch (error) {
    // No existing index, will create new one
    index = null;
  }

  // Strategy: Use incremental updates when possible, otherwise create new index
  // Note: Knowledge base is NOT indexed - it's passed as instructions separately
  if (index !== null) {
    // We have an existing index - use incremental updates
    
    // Check for new file documents and add them incrementally
    const newFileDocuments = await filterNewDocuments(fileDocuments, botId);
    if (newFileDocuments.length > 0) {
      console.log(`Adding ${newFileDocuments.length} new document(s) to existing index incrementally`);
      await addDocumentsToIndex(index, newFileDocuments, llm);
    }
    
  } else {
    // No existing index - create new one with PDF files
    const serviceContext = serviceContextFromDefaults({
      llm,
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
    });

    // Use bot-specific cache directory
    const cacheDir = botId ? `${STORAGE_CACHE_DIR}/${botId}` : STORAGE_CACHE_DIR;
    
    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      await fs.promises.mkdir(cacheDir, { recursive: true });
    }

    // Create storage context for persistence
    const storageContext = await storageContextFromDefaults({
      persistDir: cacheDir,
    });

    // Create index with PDF files only (knowledge base is NOT indexed)
    index = await VectorStoreIndex.fromDocuments(fileDocuments, { 
      serviceContext,
      storageContext, // This makes it persist!
    });
  }
  
  // Ensure index is defined
  if (index === null) {
    throw new Error('Failed to create or load index');
  }
  
  const retriever = index.asRetriever();
  retriever.similarityTopK = 5;

  return new ContextChatEngine({
    chatModel: llm,
    retriever,
    contextSystemPrompt: ({ context }) => {
      return `${baseSystemPrompt}\n\nContext from knowledge base:\n${context || 'No additional context available.'}`;
    },
  });
}
