import {
  type Discrepancy,
  type DiscrepancyType,
  getDiscrepancySeverity,
} from '../models/validation';

export interface ComponentData {
  id: string;
  title: string;
  description: string | null;
  componentType: string;
  sourceExcerpt: string | null;
}

export interface DocumentData {
  id: string;
  content: string;
  filename: string;
}

export interface SuggestedFix {
  type: 'UPDATE_TITLE' | 'UPDATE_DESCRIPTION' | 'ADD_SOURCE' | 'REVIEW_MANUALLY';
  message: string;
  suggestedValue?: string;
}

/**
 * Discrepancy Detector - Detects various types of discrepancies
 */
export class DiscrepancyDetector {
  /**
   * Detect all types of discrepancies
   */
  detectDiscrepancies(
    component: ComponentData,
    documents: DocumentData[]
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Check for content mismatches
    discrepancies.push(...this.detectContentMismatch(component, documents));

    // Check for missing data
    discrepancies.push(...this.detectMissingData(component, documents));

    // Check for conflicting sources
    discrepancies.push(...this.detectConflictingSources(component, documents));

    return discrepancies;
  }

  /**
   * Detect content mismatches between component and source documents
   */
  detectContentMismatch(
    component: ComponentData,
    documents: DocumentData[]
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    if (documents.length === 0 || !component.sourceExcerpt) {
      return discrepancies;
    }

    for (const doc of documents) {
      // Check if source excerpt exists in document
      if (component.sourceExcerpt) {
        const excerptFound = this.fuzzyMatch(
          component.sourceExcerpt.toLowerCase(),
          doc.content.toLowerCase()
        );

        if (!excerptFound) {
          discrepancies.push({
            type: 'CONTENT_MISMATCH',
            severity: getDiscrepancySeverity('CONTENT_MISMATCH'),
            message: `Source excerpt not found in document "${doc.filename}"`,
            expectedValue: component.sourceExcerpt.substring(0, 100),
            actualValue: 'Not found in document',
            sourceDocumentId: doc.id,
          });
        }
      }

      // Check if component title appears in document
      const titleFound = doc.content.toLowerCase().includes(
        component.title.toLowerCase()
      );

      if (!titleFound) {
        discrepancies.push({
          type: 'CONTENT_MISMATCH',
          severity: 'medium',
          message: `Component title "${component.title}" not found in source document`,
          expectedValue: component.title,
          actualValue: 'Not mentioned in document',
          sourceDocumentId: doc.id,
        });
      }
    }

    return discrepancies;
  }

  /**
   * Detect missing data in component
   */
  detectMissingData(
    component: ComponentData,
    documents: DocumentData[]
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    // Check for missing description
    if (!component.description || component.description.trim() === '') {
      discrepancies.push({
        type: 'MISSING_DATA',
        severity: getDiscrepancySeverity('MISSING_DATA'),
        message: 'Component is missing a description',
      });
    }

    // Check for missing source excerpt when documents exist
    if (documents.length > 0 && !component.sourceExcerpt) {
      discrepancies.push({
        type: 'MISSING_DATA',
        severity: 'low',
        message: 'Component has no linked source excerpt from documents',
      });
    }

    // Check for very short title
    if (component.title.length < 3) {
      discrepancies.push({
        type: 'MISSING_DATA',
        severity: 'low',
        message: 'Component title is too short',
        actualValue: component.title,
      });
    }

    return discrepancies;
  }

  /**
   * Detect conflicting information between sources
   */
  detectConflictingSources(
    component: ComponentData,
    documents: DocumentData[]
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];

    if (documents.length < 2) {
      return discrepancies;
    }

    // Look for the component title in multiple documents with different contexts
    const mentionsPerDoc: Map<string, string[]> = new Map();

    for (const doc of documents) {
      const mentions = this.findMentions(component.title, doc.content);
      if (mentions.length > 0) {
        mentionsPerDoc.set(doc.id, mentions);
      }
    }

    // If mentioned in multiple docs, check for conflicts
    if (mentionsPerDoc.size > 1) {
      const allMentions = Array.from(mentionsPerDoc.values()).flat();
      const hasConflict = this.detectContextConflict(allMentions);

      if (hasConflict) {
        discrepancies.push({
          type: 'CONFLICTING_SOURCES',
          severity: getDiscrepancySeverity('CONFLICTING_SOURCES'),
          message: `"${component.title}" is described differently in multiple documents`,
        });
      }
    }

    return discrepancies;
  }

  /**
   * Generate suggested fixes for discrepancies
   */
  generateSuggestedFixes(discrepancies: Discrepancy[]): SuggestedFix[] {
    const fixes: SuggestedFix[] = [];

    for (const discrepancy of discrepancies) {
      switch (discrepancy.type) {
        case 'CONTENT_MISMATCH':
          if (discrepancy.expectedValue) {
            fixes.push({
              type: 'UPDATE_TITLE',
              message: 'Update component to match source document',
              suggestedValue: discrepancy.expectedValue,
            });
          } else {
            fixes.push({
              type: 'REVIEW_MANUALLY',
              message: 'Review and update component content manually',
            });
          }
          break;

        case 'MISSING_DATA':
          if (discrepancy.message.includes('description')) {
            fixes.push({
              type: 'UPDATE_DESCRIPTION',
              message: 'Add a description to this component',
            });
          } else if (discrepancy.message.includes('source')) {
            fixes.push({
              type: 'ADD_SOURCE',
              message: 'Link this component to a source document',
            });
          }
          break;

        case 'CONFLICTING_SOURCES':
          fixes.push({
            type: 'REVIEW_MANUALLY',
            message: 'Review conflicting sources and determine correct information',
          });
          break;

        case 'OUTDATED_REFERENCE':
          fixes.push({
            type: 'REVIEW_MANUALLY',
            message: 'Check if source document needs updating',
          });
          break;

        case 'SCHEMA_VIOLATION':
          fixes.push({
            type: 'REVIEW_MANUALLY',
            message: 'Fix schema violation in component data',
          });
          break;
      }
    }

    return fixes;
  }

  /**
   * Calculate overall severity from discrepancies
   */
  calculateOverallSeverity(
    discrepancies: Discrepancy[]
  ): 'CRITICAL' | 'MAJOR' | 'MINOR' | 'NONE' {
    if (discrepancies.length === 0) {
      return 'NONE';
    }

    const hasCritical = discrepancies.some(d => d.severity === 'critical');
    const hasHigh = discrepancies.some(d => d.severity === 'high');
    const hasMedium = discrepancies.some(d => d.severity === 'medium');

    if (hasCritical) return 'CRITICAL';
    if (hasHigh) return 'MAJOR';
    if (hasMedium) return 'MINOR';

    return 'MINOR';
  }

  /**
   * Fuzzy match check - finds approximate matches
   */
  private fuzzyMatch(needle: string, haystack: string): boolean {
    // Exact match
    if (haystack.includes(needle)) {
      return true;
    }

    // Check for word-by-word match (80% threshold)
    const needleWords = needle.split(/\s+/).filter(w => w.length > 2);
    const matchedWords = needleWords.filter(word =>
      haystack.includes(word)
    );

    return matchedWords.length / needleWords.length >= 0.8;
  }

  /**
   * Find mentions of a term in content with surrounding context
   */
  private findMentions(term: string, content: string): string[] {
    const mentions: string[] = [];
    const termLower = term.toLowerCase();
    const contentLower = content.toLowerCase();

    let index = 0;
    while ((index = contentLower.indexOf(termLower, index)) !== -1) {
      // Extract context around the mention
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + term.length + 50);
      mentions.push(content.substring(start, end));
      index += term.length;
    }

    return mentions;
  }

  /**
   * Detect if contexts have conflicting information
   */
  private detectContextConflict(contexts: string[]): boolean {
    if (contexts.length < 2) return false;

    // Simple conflict detection: look for negation patterns
    const negationPatterns = [
      /not\s+/i,
      /don't\s+/i,
      /doesn't\s+/i,
      /shouldn't\s+/i,
      /cannot\s+/i,
      /never\s+/i,
      /deprecated/i,
      /removed/i,
      /obsolete/i,
    ];

    const hasNegation = contexts.some(context =>
      negationPatterns.some(pattern => pattern.test(context))
    );

    const hasPositive = contexts.some(context =>
      !negationPatterns.some(pattern => pattern.test(context))
    );

    return hasNegation && hasPositive;
  }
}

export const discrepancyDetector = new DiscrepancyDetector();
