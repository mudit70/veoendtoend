import { useState, useMemo } from 'react';
import {
  ValidationBadge,
  ValidationScoreBadge,
  ValidationSummaryBadge,
  DiscrepancyBadge,
} from './ValidationBadge';
import type { ValidationRun, ValidationResult, Discrepancy } from '../api/client';

interface ValidationReportViewProps {
  validationRun: ValidationRun;
  onClose?: () => void;
  className?: string;
}

type TabType = 'overview' | 'components' | 'discrepancies';

interface ComponentGroup {
  status: string;
  results: ValidationResult[];
}

export function ValidationReportView({
  validationRun,
  onClose,
  className = '',
}: ValidationReportViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());

  const results = validationRun.results || [];

  // Group results by status
  const groupedResults = useMemo(() => {
    const groups: Record<string, ValidationResult[]> = {
      VALID: [],
      WARNING: [],
      INVALID: [],
      UNVERIFIABLE: [],
      STALE: [],
    };

    results.forEach(result => {
      if (groups[result.status]) {
        groups[result.status].push(result);
      }
    });

    return groups;
  }, [results]);

  // Get all discrepancies with component info
  const allDiscrepancies = useMemo(() => {
    return results.flatMap(result =>
      result.discrepancies.map(d => ({
        ...d,
        componentId: result.componentId,
        resultId: result.id,
      }))
    );
  }, [results]);

  // Summary counts
  const summary = useMemo(() => ({
    totalComponents: results.length,
    validCount: groupedResults.VALID.length,
    warningCount: groupedResults.WARNING.length,
    invalidCount: groupedResults.INVALID.length,
    unverifiableCount: groupedResults.UNVERIFIABLE.length,
    staleCount: groupedResults.STALE.length,
    totalDiscrepancies: allDiscrepancies.length,
  }), [results, groupedResults, allDiscrepancies]);

  const toggleComponent = (componentId: string) => {
    setExpandedComponents(prev => {
      const next = new Set(prev);
      if (next.has(componentId)) {
        next.delete(componentId);
      } else {
        next.add(componentId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
      role="region"
      aria-label="Validation Report"
    >
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Validation Report</h2>
          <p className="text-sm text-gray-500 mt-1">
            Completed {formatDate(validationRun.completedAt || validationRun.startedAt)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {validationRun.score !== null && (
            <ValidationScoreBadge score={validationRun.score} size="lg" />
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close report"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex -mb-px" aria-label="Tabs">
          {(['overview', 'components', 'discrepancies'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-6 py-3 text-sm font-medium border-b-2 capitalize
                ${activeTab === tab
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-selected={activeTab === tab}
              role="tab"
            >
              {tab}
              {tab === 'discrepancies' && summary.totalDiscrepancies > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">
                  {summary.totalDiscrepancies}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6" role="tabpanel">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                label="Total Components"
                value={summary.totalComponents}
                color="gray"
              />
              <SummaryCard
                label="Valid"
                value={summary.validCount}
                color="green"
              />
              <SummaryCard
                label="Warnings"
                value={summary.warningCount}
                color="yellow"
              />
              <SummaryCard
                label="Invalid"
                value={summary.invalidCount}
                color="red"
              />
            </div>

            {/* Status Breakdown */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Status Breakdown</h3>
              <div className="space-y-2">
                <StatusBar label="Valid" count={summary.validCount} total={summary.totalComponents} color="green" />
                <StatusBar label="Warning" count={summary.warningCount} total={summary.totalComponents} color="yellow" />
                <StatusBar label="Invalid" count={summary.invalidCount} total={summary.totalComponents} color="red" />
                <StatusBar label="Stale" count={summary.staleCount} total={summary.totalComponents} color="orange" />
                <StatusBar label="Unverifiable" count={summary.unverifiableCount} total={summary.totalComponents} color="gray" />
              </div>
            </div>

            {/* Quick Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
              <ValidationSummaryBadge
                validCount={summary.validCount}
                warningCount={summary.warningCount}
                invalidCount={summary.invalidCount}
                totalCount={summary.totalComponents}
                size="lg"
              />
            </div>
          </div>
        )}

        {activeTab === 'components' && (
          <div className="space-y-4">
            {results.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No components validated</p>
            ) : (
              results.map(result => (
                <ComponentResultCard
                  key={result.id}
                  result={result}
                  isExpanded={expandedComponents.has(result.componentId)}
                  onToggle={() => toggleComponent(result.componentId)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'discrepancies' && (
          <div className="space-y-4">
            {allDiscrepancies.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No discrepancies found</p>
            ) : (
              allDiscrepancies.map((discrepancy, index) => (
                <DiscrepancyCard
                  key={`${discrepancy.componentId}-${index}`}
                  discrepancy={discrepancy}
                  componentId={discrepancy.componentId}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  color: 'gray' | 'green' | 'yellow' | 'red' | 'orange';
}

function SummaryCard({ label, value, color }: SummaryCardProps) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

interface StatusBarProps {
  label: string;
  count: number;
  total: number;
  color: 'green' | 'yellow' | 'red' | 'orange' | 'gray';
}

function StatusBar({ label, count, total, color }: StatusBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  const barColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    gray: 'bg-gray-400',
  };

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-gray-600">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${barColors[color]}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
      <span className="w-16 text-sm text-gray-600 text-right">{count} / {total}</span>
    </div>
  );
}

interface ComponentResultCardProps {
  result: ValidationResult;
  isExpanded: boolean;
  onToggle: () => void;
}

function ComponentResultCard({ result, isExpanded, onToggle }: ComponentResultCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <ValidationBadge status={result.status} size="sm" />
          <span className="font-medium text-gray-900">{result.componentId}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {result.discrepancies.length} discrepancies
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(result.confidence * 100)}% confidence
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 border-t">
          {result.discrepancies.length === 0 ? (
            <p className="text-sm text-gray-500">No discrepancies found</p>
          ) : (
            <div className="space-y-2">
              {result.discrepancies.map((d, idx) => (
                <div key={idx} className="text-sm">
                  <DiscrepancyBadge type={d.type} severity={d.severity} size="sm" />
                  <p className="mt-1 text-gray-600">{d.message}</p>
                  {d.expectedValue && (
                    <p className="text-gray-500">Expected: {d.expectedValue}</p>
                  )}
                  {d.actualValue && (
                    <p className="text-gray-500">Actual: {d.actualValue}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DiscrepancyCardProps {
  discrepancy: Discrepancy & { componentId: string };
  componentId: string;
}

function DiscrepancyCard({ discrepancy, componentId }: DiscrepancyCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <DiscrepancyBadge type={discrepancy.type} severity={discrepancy.severity} />
          <p className="mt-2 text-gray-700">{discrepancy.message}</p>
        </div>
        <span className="text-sm text-gray-500">{componentId}</span>
      </div>
      {(discrepancy.expectedValue || discrepancy.actualValue) && (
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          {discrepancy.expectedValue && (
            <div>
              <p className="font-medium text-gray-600">Expected:</p>
              <p className="text-gray-500 mt-1">{discrepancy.expectedValue}</p>
            </div>
          )}
          {discrepancy.actualValue && (
            <div>
              <p className="font-medium text-gray-600">Actual:</p>
              <p className="text-gray-500 mt-1">{discrepancy.actualValue}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ValidationReportView;
