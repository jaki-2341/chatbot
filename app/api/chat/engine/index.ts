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
  role?: string,
  collectInfoEnabled?: boolean,
  collectName?: boolean,
  collectEmail?: boolean,
  collectPhone?: boolean,
  isFirstUserMessage?: boolean,
  hasRequestedInfo?: boolean
) {
  const hasKnowledgeBase = knowledgeBase && knowledgeBase.trim();
  
  // Build base system prompt with name, role, and instructions
  let baseSystemPrompt = '';
  
  // Start with identity: name and role
  if (agentName && role) {
    baseSystemPrompt = `You are ${agentName}, ${role}. Your name is ${agentName}. Only mention your name when users explicitly ask about it (e.g., "What's your name?" or "Who are you?"). Do NOT introduce yourself or mention your name in every response - only answer the user's question directly.`;
  } else if (agentName) {
    baseSystemPrompt = `You are ${agentName}, a helpful customer support agent. Your name is ${agentName}. Only mention your name when users explicitly ask about it (e.g., "What's your name?" or "Who are you?"). Do NOT introduce yourself or mention your name in every response - only answer the user's question directly.`;
  } else if (role) {
    baseSystemPrompt = `You are ${role}.`;
  } else {
    baseSystemPrompt = `You are a helpful customer support agent.`;
  }
  
  // Add prompt instructions (knowledgeBase)
  if (hasKnowledgeBase) {
    baseSystemPrompt += `\n\nYour instructions and guidelines:\n${knowledgeBase}`;
  }
  
  // Core RAG-first approach: Always use context when available
  baseSystemPrompt += `\n\nIMPORTANT - USE RAG CONTEXT: You will receive context from the knowledge base (retrieved documents and resources). This context is your primary source of information. 

- ALWAYS prioritize and use the provided context to answer questions
- When context is available, base your answer on that information
- If the context contains relevant information, use it to provide a comprehensive, helpful answer
- Only ask for clarification if the question is truly unclear AND you have no relevant context
- Be proactive: if context has information related to the question (even if the question is general), provide that information
- Synthesize information from the context to give complete, accurate answers
- If multiple relevant pieces of information exist in the context, include them in your answer

The context you receive is authoritative - trust it and use it to provide accurate, detailed responses.`;
  
  // Add instruction for handling user information when it's provided
  if (collectInfoEnabled) {
    baseSystemPrompt += `\n\nWhen you receive a message that says "I've provided my information:" followed by Name, Email, or Phone, this means the user has completed a form. Respond warmly with a brief, friendly acknowledgment and invite them to continue. Do not repeat back their information. Examples: "Wonderful! I'm here to help. What can I do for you today?" or "Perfect! I'm ready to assist you. How can I help?"`;
  }
  
  // Natural conversation flow based on context
  baseSystemPrompt += `\n\nCONVERSATION STYLE: 
- Answer questions directly and completely using the context provided
- Be natural and conversational
- If appropriate, you can ask relevant follow-up questions to help the user, but prioritize answering their current question first
- Maintain context from previous messages in the conversation
- Keep responses helpful, clear, and focused on being useful to the user`;
  
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
        if (context && context.trim()) {
          return `${baseSystemPrompt}\n\nRELEVANT CONTEXT FROM KNOWLEDGE BASE (Use this information to answer the user's question):\n${context}\n\nUse the context above to provide a comprehensive, accurate answer. The context contains relevant information that should be used to answer the user's question.`;
        } else {
          return `${baseSystemPrompt}\n\nNo additional context available from knowledge base. Answer based on your general knowledge and the instructions provided above.`;
        }
      },
    });
  }
  
  // We have documents - proceed with creating/updating index
  // Try to load from existing index (for pre-indexed documents)
  let index: VectorStoreIndex | null = null;
  try {
    index = await getDataSource(llm, botId);
    console.log(`[RAG] Successfully loaded existing index for botId: ${botId}`);
  } catch (error) {
    // No existing index, will create new one
    console.log(`[RAG] No existing index found for botId: ${botId}, will create new one. Error: ${(error as Error).message}`);
    index = null;
  }

  // Strategy: Use incremental updates when possible, otherwise create new index
  // Note: Knowledge base is NOT indexed - it's passed as instructions separately
  if (index !== null) {
    // We have an existing index - use incremental updates
    
    // Check for new file documents and add them incrementally
    const newFileDocuments = await filterNewDocuments(fileDocuments, botId);
    if (newFileDocuments.length > 0) {
      console.log(`[RAG] Adding ${newFileDocuments.length} new document(s) to existing index incrementally for botId: ${botId}`);
      await addDocumentsToIndex(index, newFileDocuments, llm);
    } else {
      console.log(`[RAG] No new documents to add for botId: ${botId}, using existing index`);
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
    console.log(`[RAG] Creating new index with ${fileDocuments.length} document(s) for botId: ${botId}`);
    index = await VectorStoreIndex.fromDocuments(fileDocuments, { 
      serviceContext,
      storageContext, // This makes it persist!
    });
    console.log(`[RAG] Successfully created new index for botId: ${botId}`);
  }
  
  // Ensure index is defined
  if (index === null) {
    throw new Error('Failed to create or load index');
  }
  
  const retriever = index.asRetriever();
  retriever.similarityTopK = 5;
  
  console.log(`[RAG] Created retriever with similarityTopK=5 for botId: ${botId}`);

  return new ContextChatEngine({
    chatModel: llm,
    retriever,
    contextSystemPrompt: ({ context }) => {
        if (context && context.trim()) {
          console.log(`[RAG] Retrieved context for botId ${botId}, context length: ${context.length} characters`);
          console.log(`[RAG] Context preview: "${context.substring(0, 200)}..."`);
          
          // Stronger prompt to ensure context is used
          return `${baseSystemPrompt}

═══════════════════════════════════════════════════════════════
CRITICAL: YOU MUST USE THE CONTEXT BELOW TO ANSWER THE QUESTION
═══════════════════════════════════════════════════════════════

The following context was retrieved from the knowledge base and uploaded documents. This context contains the EXACT information needed to answer the user's question. You MUST base your answer primarily on this context.

RETRIEVED CONTEXT FROM KNOWLEDGE BASE:
${context}

INSTRUCTIONS FOR USING THIS CONTEXT:
1. Read the context carefully - it contains relevant information about the user's question
2. Extract specific details, facts, and information from the context
3. Use the context as your PRIMARY source of information
4. If the context mentions specific services, products, prices, features, or details - include them in your answer
5. Do NOT give generic answers when the context has specific information
6. Synthesize the information from the context to provide a complete, accurate answer
7. If the context is long, extract the most relevant parts that directly answer the question
8. Quote or reference specific details from the context when relevant

Your answer should be based on the context above. If the context contains the answer, use it. Do not provide generic responses when specific information is available in the context.`;
        } else {
          console.log(`[RAG] No context retrieved for botId ${botId} - this may indicate RAG is not working properly`);
          return `${baseSystemPrompt}\n\nNo additional context available from knowledge base. Answer based on your general knowledge and the instructions provided above.`;
        }
    },
  });
}
