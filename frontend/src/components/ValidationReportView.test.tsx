import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationReportView } from './ValidationReportView';
import type { ValidationRun, ValidationResult } from '../api/client';

describe('ValidationReportView', () => {
  const mockResults: ValidationResult[] = [
    {
      id: 'result-1',
      validationRunId: 'run-1',
      componentId: 'comp-1',
      status: 'VALID',
      discrepancies: [],
      confidence: 0.95,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'result-2',
      validationRunId: 'run-1',
      componentId: 'comp-2',
      status: 'WARNING',
      discrepancies: [
        {
          type: 'CONTENT_MISMATCH',
          severity: 'high',
          message: 'Title does not match source document',
          expectedValue: 'Expected Title',
          actualValue: 'Actual Title',
        },
      ],
      confidence: 0.85,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'result-3',
      validationRunId: 'run-1',
      componentId: 'comp-3',
      status: 'INVALID',
      discrepancies: [
        {
          type: 'CONFLICTING_SOURCES',
          severity: 'critical',
          message: 'Conflicting information found',
        },
      ],
      confidence: 0.90,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockValidationRun: ValidationRun = {
    id: 'run-1',
    diagramId: 'diagram-1',
    status: 'COMPLETED',
    score: 75,
    totalComponents: 3,
    validatedComponents: 3,
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:01:00Z',
    results: mockResults,
  };

  it('should render validation report header', () => {
    render(<ValidationReportView validationRun={mockValidationRun} />);

    expect(screen.getByText('Validation Report')).toBeInTheDocument();
  });

  it('should display score badge', () => {
    render(<ValidationReportView validationRun={mockValidationRun} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('should render tabs', () => {
    render(<ValidationReportView validationRun={mockValidationRun} />);

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /components/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /discrepancies/i })).toBeInTheDocument();
  });

  it('should show discrepancy count badge', () => {
    render(<ValidationReportView validationRun={mockValidationRun} />);

    // 2 discrepancies total
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<ValidationReportView validationRun={mockValidationRun} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close report'));

    expect(onClose).toHaveBeenCalled();
  });

  describe('overview tab', () => {
    it('should show summary cards', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      expect(screen.getByText('Total Components')).toBeInTheDocument();
      // Use getAllByText since 'Valid' appears multiple times
      expect(screen.getAllByText('Valid').length).toBeGreaterThan(0);
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      // 'Invalid' also appears multiple times
      expect(screen.getAllByText('Invalid').length).toBeGreaterThan(0);
    });

    it('should display correct counts', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      // Total: 3 (appears in summary card)
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });

    it('should show status breakdown', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      expect(screen.getByText('Status Breakdown')).toBeInTheDocument();
    });
  });

  describe('components tab', () => {
    it('should switch to components tab', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /components/i }));

      expect(screen.getByText('comp-1')).toBeInTheDocument();
      expect(screen.getByText('comp-2')).toBeInTheDocument();
      expect(screen.getByText('comp-3')).toBeInTheDocument();
    });

    it('should show discrepancy count per component', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /components/i }));

      // '1 discrepancies' appears twice (comp-2 and comp-3 both have 1)
      expect(screen.getAllByText('1 discrepancies').length).toBeGreaterThan(0);
      expect(screen.getByText('0 discrepancies')).toBeInTheDocument();
    });

    it('should show confidence percentage', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /components/i }));

      expect(screen.getByText('95% confidence')).toBeInTheDocument();
      expect(screen.getByText('85% confidence')).toBeInTheDocument();
    });

    it('should expand component to show discrepancies', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /components/i }));

      // Click on comp-2 to expand
      const comp2Button = screen.getByText('comp-2').closest('button');
      if (comp2Button) {
        fireEvent.click(comp2Button);
      }

      expect(screen.getByText('Title does not match source document')).toBeInTheDocument();
    });

    it('should show no discrepancies message when empty', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /components/i }));

      // Expand comp-1 which has no discrepancies
      const comp1Button = screen.getByText('comp-1').closest('button');
      if (comp1Button) {
        fireEvent.click(comp1Button);
      }

      expect(screen.getByText('No discrepancies found')).toBeInTheDocument();
    });

    it('should collapse expanded component on second click', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /components/i }));

      const comp2Button = screen.getByText('comp-2').closest('button');
      if (comp2Button) {
        fireEvent.click(comp2Button);
        expect(screen.getByText('Title does not match source document')).toBeInTheDocument();

        fireEvent.click(comp2Button);
        expect(screen.queryByText('Title does not match source document')).not.toBeInTheDocument();
      }
    });
  });

  describe('discrepancies tab', () => {
    it('should switch to discrepancies tab', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /discrepancies/i }));

      expect(screen.getByText('Title does not match source document')).toBeInTheDocument();
      expect(screen.getByText('Conflicting information found')).toBeInTheDocument();
    });

    it('should show component id for each discrepancy', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /discrepancies/i }));

      expect(screen.getByText('comp-2')).toBeInTheDocument();
      expect(screen.getByText('comp-3')).toBeInTheDocument();
    });

    it('should show expected and actual values', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /discrepancies/i }));

      expect(screen.getByText('Expected:')).toBeInTheDocument();
      expect(screen.getByText('Expected Title')).toBeInTheDocument();
      expect(screen.getByText('Actual:')).toBeInTheDocument();
      expect(screen.getByText('Actual Title')).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('should show message when no components validated', () => {
      const emptyRun: ValidationRun = {
        ...mockValidationRun,
        results: [],
      };

      render(<ValidationReportView validationRun={emptyRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /components/i }));

      expect(screen.getByText('No components validated')).toBeInTheDocument();
    });

    it('should show message when no discrepancies', () => {
      const noDiscrepanciesRun: ValidationRun = {
        ...mockValidationRun,
        results: [
          {
            id: 'result-1',
            validationRunId: 'run-1',
            componentId: 'comp-1',
            status: 'VALID',
            discrepancies: [],
            confidence: 0.95,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      render(<ValidationReportView validationRun={noDiscrepanciesRun} />);

      fireEvent.click(screen.getByRole('tab', { name: /discrepancies/i }));

      expect(screen.getByText('No discrepancies found')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have region role with label', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      expect(screen.getByRole('region', { name: 'Validation Report' })).toBeInTheDocument();
    });

    it('should have proper tab roles', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('should mark active tab as selected', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      expect(overviewTab).toHaveAttribute('aria-selected', 'true');

      fireEvent.click(screen.getByRole('tab', { name: /components/i }));

      expect(overviewTab).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('tab', { name: /components/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('should have tabpanel role for content', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ValidationReportView validationRun={mockValidationRun} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('should display completion date', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      // Check that the date is displayed (format depends on locale)
      expect(screen.getByText(/Completed/)).toBeInTheDocument();
    });
  });

  describe('without close button', () => {
    it('should not render close button when onClose not provided', () => {
      render(<ValidationReportView validationRun={mockValidationRun} />);

      expect(screen.queryByLabelText('Close report')).not.toBeInTheDocument();
    });
  });
});
