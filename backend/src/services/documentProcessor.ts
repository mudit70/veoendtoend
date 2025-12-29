import crypto from 'crypto';
import pdf from 'pdf-parse';

export interface ProcessedDocument {
  content: string;
  extractedText: string;
  hash: string;
  size: number;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
}

export interface DocumentChunk {
  index: number;
  content: string;
  startOffset: number;
  endOffset: number;
}

export interface DocumentMetadata {
  pageCount?: number;
  wordCount: number;
  lineCount: number;
  encoding: string;
}

// Maximum chunk size in characters (for large file handling)
const MAX_CHUNK_SIZE = 50000; // ~50KB per chunk

/**
 * Document Processor Service
 * Handles text extraction, hashing, and chunking for documents
 */
export class DocumentProcessor {
  /**
   * Process a document buffer and extract text, hash, and metadata
   */
  async process(buffer: Buffer, mimeType: string, filename: string): Promise<ProcessedDocument> {
    let content: string;
    let extractedText: string;
    let metadata: DocumentMetadata;

    // Extract text based on MIME type
    if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      const result = await this.extractFromPDF(buffer);
      content = buffer.toString('base64'); // Store PDF as base64
      extractedText = result.text;
      metadata = {
        pageCount: result.pageCount,
        wordCount: this.countWords(result.text),
        lineCount: this.countLines(result.text),
        encoding: 'base64',
      };
    } else {
      // Text-based files
      content = buffer.toString('utf-8');
      extractedText = content;
      metadata = {
        wordCount: this.countWords(content),
        lineCount: this.countLines(content),
        encoding: 'utf-8',
      };
    }

    // Calculate hash for content deduplication and versioning
    const hash = this.calculateHash(buffer);

    // Create chunks for large files
    const chunks = this.createChunks(extractedText);

    return {
      content,
      extractedText,
      hash,
      size: buffer.length,
      chunks,
      metadata,
    };
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  private async extractFromPDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      const data = await pdf(buffer);
      return {
        text: data.text || '',
        pageCount: data.numpages || 0,
      };
    } catch (error) {
      // Return empty result for corrupt PDFs
      console.error('PDF extraction failed:', error);
      return {
        text: '',
        pageCount: 0,
      };
    }
  }

  /**
   * Calculate SHA-256 hash of the document
   */
  calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Calculate hash from string content
   */
  calculateHashFromString(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  /**
   * Create chunks from text for large file handling
   */
  createChunks(text: string): DocumentChunk[] {
    if (text.length <= MAX_CHUNK_SIZE) {
      return [{
        index: 0,
        content: text,
        startOffset: 0,
        endOffset: text.length,
      }];
    }

    const chunks: DocumentChunk[] = [];
    let startOffset = 0;
    let index = 0;

    while (startOffset < text.length) {
      let endOffset = Math.min(startOffset + MAX_CHUNK_SIZE, text.length);

      // Try to break at a natural boundary (newline or space)
      if (endOffset < text.length) {
        const lastNewline = text.lastIndexOf('\n', endOffset);
        const lastSpace = text.lastIndexOf(' ', endOffset);
        const breakPoint = Math.max(lastNewline, lastSpace);

        if (breakPoint > startOffset) {
          endOffset = breakPoint + 1;
        }
      }

      chunks.push({
        index,
        content: text.slice(startOffset, endOffset),
        startOffset,
        endOffset,
      });

      startOffset = endOffset;
      index++;
    }

    return chunks;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Count lines in text
   */
  private countLines(text: string): number {
    return text.split('\n').length;
  }

  /**
   * Check if two documents are identical based on hash
   */
  areIdentical(hash1: string, hash2: string): boolean {
    return hash1 === hash2;
  }

  /**
   * Detect if content has changed between two versions
   */
  hasChanged(oldHash: string, newHash: string): boolean {
    return oldHash !== newHash;
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();
