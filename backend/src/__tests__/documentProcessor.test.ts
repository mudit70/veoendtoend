import { describe, it, expect } from 'vitest';
import { documentProcessor } from '../services/documentProcessor.js';

describe('DocumentProcessor', () => {
  describe('process', () => {
    it('should process plain text content', async () => {
      const content = 'Hello World\nThis is a test file.\nWith multiple lines.';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/plain', 'test.txt');

      expect(result.content).toBe(content);
      expect(result.extractedText).toBe(content);
      expect(result.size).toBe(buffer.length);
      expect(result.hash).toBeDefined();
      expect(result.hash).toHaveLength(64); // SHA-256 hex length
      expect(result.metadata.encoding).toBe('utf-8');
      expect(result.metadata.lineCount).toBe(3);
      expect(result.metadata.wordCount).toBe(10);
    });

    it('should process JSON content', async () => {
      const jsonContent = JSON.stringify({ name: 'test', values: [1, 2, 3] });
      const buffer = Buffer.from(jsonContent, 'utf-8');

      const result = await documentProcessor.process(buffer, 'application/json', 'test.json');

      expect(result.content).toBe(jsonContent);
      expect(result.extractedText).toBe(jsonContent);
      expect(result.metadata.encoding).toBe('utf-8');
    });

    it('should process markdown content', async () => {
      const markdown = '# Title\n\nParagraph text here.\n\n- Item 1\n- Item 2';
      const buffer = Buffer.from(markdown, 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/markdown', 'test.md');

      expect(result.content).toBe(markdown);
      expect(result.extractedText).toBe(markdown);
      expect(result.metadata.lineCount).toBe(6);
    });

    it('should process TypeScript code files', async () => {
      const code = 'function hello(): string {\n  return "Hello World";\n}';
      const buffer = Buffer.from(code, 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/typescript', 'test.ts');

      expect(result.content).toBe(code);
      expect(result.extractedText).toBe(code);
      expect(result.metadata.lineCount).toBe(3);
    });
  });

  describe('calculateHash', () => {
    it('should calculate consistent SHA-256 hash', () => {
      const content = 'Test content for hashing';
      const buffer = Buffer.from(content, 'utf-8');

      const hash1 = documentProcessor.calculateHash(buffer);
      const hash2 = documentProcessor.calculateHash(buffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should produce different hashes for different content', () => {
      const buffer1 = Buffer.from('Content A', 'utf-8');
      const buffer2 = Buffer.from('Content B', 'utf-8');

      const hash1 = documentProcessor.calculateHash(buffer1);
      const hash2 = documentProcessor.calculateHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('calculateHashFromString', () => {
    it('should calculate hash from string content', () => {
      const content = 'Test string content';

      const hash = documentProcessor.calculateHashFromString(content);

      expect(hash).toHaveLength(64);
    });

    it('should match buffer hash for same content', () => {
      const content = 'Matching content';
      const buffer = Buffer.from(content, 'utf-8');

      const hashFromBuffer = documentProcessor.calculateHash(buffer);
      const hashFromString = documentProcessor.calculateHashFromString(content);

      expect(hashFromBuffer).toBe(hashFromString);
    });
  });

  describe('createChunks', () => {
    it('should return single chunk for small text', () => {
      const text = 'Small text content';

      const chunks = documentProcessor.createChunks(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].content).toBe(text);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].endOffset).toBe(text.length);
    });

    it('should create multiple chunks for large text', () => {
      // Create text larger than MAX_CHUNK_SIZE (50000 chars)
      const largeText = 'x'.repeat(120000);

      const chunks = documentProcessor.createChunks(largeText);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].startOffset).toBe(0);

      // Verify all content is preserved
      const reconstructed = chunks.map(c => c.content).join('');
      expect(reconstructed).toBe(largeText);
    });

    it('should break at natural boundaries when possible', () => {
      // Create text with newlines, larger than one chunk
      const lines = Array(2000).fill('This is a line of text that will be part of a large document').join('\n');

      const chunks = documentProcessor.createChunks(lines);

      // Check that chunks break at newlines (content should end with newline or be the last chunk)
      for (let i = 0; i < chunks.length - 1; i++) {
        const lastChar = chunks[i].content.slice(-1);
        expect(['\n', ' ']).toContain(lastChar);
      }
    });

    it('should maintain correct offsets across chunks', () => {
      const text = 'a'.repeat(60000) + '\n' + 'b'.repeat(60000);

      const chunks = documentProcessor.createChunks(text);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        expect(chunk.content).toBe(text.slice(chunk.startOffset, chunk.endOffset));
      }
    });
  });

  describe('areIdentical', () => {
    it('should return true for matching hashes', () => {
      const hash = 'abc123def456';

      expect(documentProcessor.areIdentical(hash, hash)).toBe(true);
    });

    it('should return false for different hashes', () => {
      expect(documentProcessor.areIdentical('hash1', 'hash2')).toBe(false);
    });
  });

  describe('hasChanged', () => {
    it('should return false for same hash', () => {
      const hash = 'samehash';

      expect(documentProcessor.hasChanged(hash, hash)).toBe(false);
    });

    it('should return true for different hashes', () => {
      expect(documentProcessor.hasChanged('old', 'new')).toBe(true);
    });
  });

  describe('metadata extraction', () => {
    it('should count words correctly', async () => {
      const content = 'One two three four five';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/plain', 'test.txt');

      expect(result.metadata.wordCount).toBe(5);
    });

    it('should handle multiple spaces between words', async () => {
      const content = 'Word1   Word2    Word3';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/plain', 'test.txt');

      expect(result.metadata.wordCount).toBe(3);
    });

    it('should count lines including empty ones', async () => {
      const content = 'Line 1\nLine 2\n\nLine 4';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/plain', 'test.txt');

      expect(result.metadata.lineCount).toBe(4);
    });

    it('should handle single line content', async () => {
      const content = 'Single line without newline';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/plain', 'test.txt');

      expect(result.metadata.lineCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const buffer = Buffer.from('', 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/plain', 'empty.txt');

      expect(result.content).toBe('');
      expect(result.extractedText).toBe('');
      expect(result.size).toBe(0);
      expect(result.metadata.wordCount).toBe(0);
      expect(result.metadata.lineCount).toBe(1);
    });

    it('should handle content with special characters', async () => {
      const content = 'Special chars: äöü éèê 中文 🚀 \\n \\t';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/plain', 'special.txt');

      expect(result.content).toBe(content);
      expect(result.extractedText).toBe(content);
    });

    it('should handle binary-like content in text files', async () => {
      const content = 'Text with \x00 null bytes';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await documentProcessor.process(buffer, 'text/plain', 'binary.txt');

      expect(result.content).toBe(content);
    });
  });
});
