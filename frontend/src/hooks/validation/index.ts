/**
 * Validation Hooks
 *
 * This module provides React hooks for validation functionality:
 * - useValidation: Hook for triggering and tracking validation progress
 *
 * @example
 * ```tsx
 * import { useValidation } from './hooks/validation';
 *
 * function DiagramToolbar({ diagramId }) {
 *   const {
 *     isValidating,
 *     validationRun,
 *     progress,
 *     error,
 *     startValidation,
 *     cancelValidation,
 *   } = useValidation(diagramId, {
 *     onComplete: (run) => console.log('Complete!', run.score),
 *     onError: (err) => console.error('Failed:', err),
 *   });
 *
 *   return (
 *     <button onClick={startValidation} disabled={isValidating}>
 *       {isValidating ? `${progress}%` : 'Validate'}
 *     </button>
 *   );
 * }
 * ```
 */

export { useValidation } from '../useValidation';
