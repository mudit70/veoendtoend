import Anthropic from '@anthropic-ai/sdk';
import type { OperationType } from '@veoendtoend/shared';

export interface DiscoveredOperation {
  name: string;
  description: string;
  type: OperationType;
  confidence: number;
  sourceReferences: string[];
}

export interface DiscoveryResult {
  operations: DiscoveredOperation[];
  summary: string;
}

export interface LLMClientConfig {
  apiKey?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  rateLimitPerMinute?: number;
}

const DEFAULT_CONFIG: Required<LLMClientConfig> = {
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  maxRetries: 3,
  retryDelayMs: 1000,
  rateLimitPerMinute: 50,
};

const DISCOVERY_PROMPT = `You are an expert software architect analyzing documentation to discover end-to-end operations in a system.

An "operation" is a complete user-facing workflow or API endpoint that involves multiple components working together. Examples include:
- User login flow
- Create new order
- Fetch dashboard data
- Process payment

For each operation you discover, provide:
1. name: A clear, action-oriented name (e.g., "User Authentication", "Order Submission")
2. description: A brief description of what the operation does
3. type: One of USER_INTERACTION, CLIENT_OPERATION, API_CALL, or DATA_FLOW
4. confidence: A score from 0.0 to 1.0 indicating how confident you are
5. sourceReferences: Relevant quotes or references from the documents

Analyze the following documents and return a JSON response with this exact structure:
{
  "operations": [
    {
      "name": "Operation Name",
      "description": "What this operation does",
      "type": "USER_INTERACTION",
      "confidence": 0.9,
      "sourceReferences": ["relevant quote 1", "relevant quote 2"]
    }
  ],
  "summary": "A brief summary of the system and discovered operations"
}

DOCUMENTS:
`;

/**
 * LLM Client wrapper for Anthropic Claude API
 * Handles rate limiting, retries, and response parsing
 */
export class LLMClient {
  private client: Anthropic | null = null;
  private config: Required<LLMClientConfig>;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private requestWindow: number = 60000; // 1 minute in ms

  constructor(config: LLMClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.apiKey) {
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
      });
    }
  }

  /**
   * Check if the client is configured with an API key
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.client !== null;
  }

  /**
   * Rate limiting - wait if we've exceeded the rate limit
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counter if we're in a new window
    if (now - this.lastRequestTime > this.requestWindow) {
      this.requestCount = 0;
    }

    // If we're at the limit, wait for the window to reset
    if (this.requestCount >= this.config.rateLimitPerMinute) {
      const waitTime = this.requestWindow - (now - this.lastRequestTime);
      if (waitTime > 0) {
        await this.delay(waitTime);
        this.requestCount = 0;
      }
    }

    this.lastRequestTime = now;
    this.requestCount++;
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Call the Anthropic API with retry logic
   */
  private async callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication errors
        if (lastError.message.includes('authentication') ||
            lastError.message.includes('invalid_api_key')) {
          throw lastError;
        }

        // Wait before retrying with exponential backoff
        if (attempt < this.config.maxRetries - 1) {
          const backoffDelay = this.config.retryDelayMs * Math.pow(2, attempt);
          await this.delay(backoffDelay);
        }
      }
    }

    throw lastError || new Error('Failed after max retries');
  }

  /**
   * Parse LLM response to extract operations
   */
  parseDiscoveryResponse(responseText: string): DiscoveryResult {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (!Array.isArray(parsed.operations)) {
        throw new Error('Invalid response: missing operations array');
      }

      // Validate and normalize each operation
      const operations: DiscoveredOperation[] = parsed.operations.map((op: Record<string, unknown>) => {
        const validTypes: OperationType[] = ['USER_INTERACTION', 'CLIENT_OPERATION', 'API_CALL', 'DATA_FLOW'];
        const type = validTypes.includes(op.type as OperationType)
          ? (op.type as OperationType)
          : 'API_CALL';

        return {
          name: String(op.name || 'Unknown Operation'),
          description: String(op.description || ''),
          type,
          confidence: Math.max(0, Math.min(1, Number(op.confidence) || 0.5)),
          sourceReferences: Array.isArray(op.sourceReferences)
            ? op.sourceReferences.map(String)
            : [],
        };
      });

      return {
        operations,
        summary: String(parsed.summary || 'No summary provided'),
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Discover operations from document content
   */
  async discoverOperations(documentContents: { filename: string; content: string }[]): Promise<DiscoveryResult> {
    if (!this.isConfigured()) {
      // Return mock data when not configured (for development/testing)
      return this.getMockDiscoveryResult();
    }

    // Format documents for the prompt
    const documentsText = documentContents
      .map((doc, i) => `--- Document ${i + 1}: ${doc.filename} ---\n${doc.content.slice(0, 10000)}`) // Limit each doc
      .join('\n\n');

    const fullPrompt = DISCOVERY_PROMPT + documentsText;

    const response = await this.callWithRetry(async () => {
      return await this.client!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
      });
    });

    // Extract text content from response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return this.parseDiscoveryResponse(textContent.text);
  }

  /**
   * Get mock discovery result for development/testing
   */
  getMockDiscoveryResult(): DiscoveryResult {
    return {
      operations: [
        {
          name: 'User Authentication',
          description: 'Handles user login and session management',
          type: 'USER_INTERACTION',
          confidence: 0.85,
          sourceReferences: ['login endpoint', 'session token'],
        },
        {
          name: 'Data Retrieval',
          description: 'Fetches data from the backend API',
          type: 'API_CALL',
          confidence: 0.9,
          sourceReferences: ['GET /api/data', 'response handling'],
        },
        {
          name: 'Form Submission',
          description: 'Submits form data to the server',
          type: 'CLIENT_OPERATION',
          confidence: 0.75,
          sourceReferences: ['POST request', 'form validation'],
        },
      ],
      summary: 'Mock discovery result for development. Configure ANTHROPIC_API_KEY to use real LLM.',
    };
  }
}

// Export singleton instance
export const llmClient = new LLMClient();
