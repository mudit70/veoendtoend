import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ValidationBadge,
  ValidationScoreBadge,
  ValidationSummaryBadge,
  DiscrepancyBadge,
} from './ValidationBadge';

describe('ValidationBadge', () => {
  describe('status display', () => {
    it('should display VALID status', () => {
      render(<ValidationBadge status="VALID" />);

      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Validation status: Valid');
    });

    it('should display WARNING status', () => {
      render(<ValidationBadge status="WARNING" />);

      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should display INVALID status', () => {
      render(<ValidationBadge status="INVALID" />);

      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });

    it('should display UNVERIFIABLE status', () => {
      render(<ValidationBadge status="UNVERIFIABLE" />);

      expect(screen.getByText('Unverifiable')).toBeInTheDocument();
    });

    it('should display STALE status', () => {
      render(<ValidationBadge status="STALE" />);

      expect(screen.getByText('Stale')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('should apply small size classes', () => {
      const { container } = render(<ValidationBadge status="VALID" size="sm" />);

      expect(container.querySelector('.text-xs')).toBeInTheDocument();
    });

    it('should apply medium size classes by default', () => {
      const { container } = render(<ValidationBadge status="VALID" />);

      expect(container.querySelector('.text-sm')).toBeInTheDocument();
    });

    it('should apply large size classes', () => {
      const { container } = render(<ValidationBadge status="VALID" size="lg" />);

      expect(container.querySelector('.text-base')).toBeInTheDocument();
    });
  });

  describe('score display', () => {
    it('should show score when showScore is true', () => {
      render(<ValidationBadge status="VALID" score={85} showScore={true} />);

      expect(screen.getByText('(85%)')).toBeInTheDocument();
    });

    it('should not show score when showScore is false', () => {
      render(<ValidationBadge status="VALID" score={85} showScore={false} />);

      expect(screen.queryByText('(85%)')).not.toBeInTheDocument();
    });

    it('should not show score when score is null', () => {
      render(<ValidationBadge status="VALID" score={null} showScore={true} />);

      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have green background for VALID', () => {
      const { container } = render(<ValidationBadge status="VALID" />);

      expect(container.querySelector('.bg-green-100')).toBeInTheDocument();
    });

    it('should have yellow background for WARNING', () => {
      const { container } = render(<ValidationBadge status="WARNING" />);

      expect(container.querySelector('.bg-yellow-100')).toBeInTheDocument();
    });

    it('should have red background for INVALID', () => {
      const { container } = render(<ValidationBadge status="INVALID" />);

      expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<ValidationBadge status="VALID" className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});

describe('ValidationScoreBadge', () => {
  it('should display score percentage', () => {
    render(<ValidationScoreBadge score={85} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should display Excellent for score >= 90', () => {
    render(<ValidationScoreBadge score={95} />);

    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('should display Good for score >= 75', () => {
    render(<ValidationScoreBadge score={80} />);

    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('should display Fair for score >= 60', () => {
    render(<ValidationScoreBadge score={65} />);

    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('should display Poor for score >= 40', () => {
    render(<ValidationScoreBadge score={45} />);

    expect(screen.getByText('Poor')).toBeInTheDocument();
  });

  it('should display Critical for score < 40', () => {
    render(<ValidationScoreBadge score={30} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('should round decimal scores', () => {
    render(<ValidationScoreBadge score={85.7} />);

    expect(screen.getByText('86%')).toBeInTheDocument();
  });

  it('should have proper aria-label', () => {
    render(<ValidationScoreBadge score={85} />);

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Validation score: 85% (Good)'
    );
  });

  it('should apply size variants', () => {
    const { container } = render(<ValidationScoreBadge score={85} size="lg" />);

    expect(container.querySelector('.text-base')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ValidationScoreBadge score={85} className="custom-class" />);

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('ValidationSummaryBadge', () => {
  it('should display all counts', () => {
    render(
      <ValidationSummaryBadge
        validCount={5}
        warningCount={2}
        invalidCount={1}
        totalCount={10}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should not show warning count when zero', () => {
    render(
      <ValidationSummaryBadge
        validCount={8}
        warningCount={0}
        invalidCount={2}
        totalCount={10}
      />
    );

    // Should show 8, 2, 10 but not a separate 0
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should not show invalid count when zero', () => {
    render(
      <ValidationSummaryBadge
        validCount={8}
        warningCount={2}
        invalidCount={0}
        totalCount={10}
      />
    );

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should have red background when invalid > 0', () => {
    const { container } = render(
      <ValidationSummaryBadge
        validCount={5}
        warningCount={2}
        invalidCount={1}
        totalCount={10}
      />
    );

    expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
  });

  it('should have yellow background when warning > 0 but invalid = 0', () => {
    const { container } = render(
      <ValidationSummaryBadge
        validCount={8}
        warningCount={2}
        invalidCount={0}
        totalCount={10}
      />
    );

    expect(container.querySelector('.bg-yellow-100')).toBeInTheDocument();
  });

  it('should have green background when all valid', () => {
    const { container } = render(
      <ValidationSummaryBadge
        validCount={10}
        warningCount={0}
        invalidCount={0}
        totalCount={10}
      />
    );

    expect(container.querySelector('.bg-green-100')).toBeInTheDocument();
  });

  it('should have proper aria-label', () => {
    render(
      <ValidationSummaryBadge
        validCount={5}
        warningCount={2}
        invalidCount={1}
        totalCount={10}
      />
    );

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Validation summary: 5 valid, 2 warnings, 1 invalid out of 10 total'
    );
  });
});

describe('DiscrepancyBadge', () => {
  it('should display discrepancy type', () => {
    render(<DiscrepancyBadge type="CONTENT_MISMATCH" severity="high" />);

    expect(screen.getByText('Content Mismatch')).toBeInTheDocument();
  });

  it('should display severity', () => {
    render(<DiscrepancyBadge type="MISSING_DATA" severity="medium" />);

    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('should handle all discrepancy types', () => {
    const types = [
      'CONTENT_MISMATCH',
      'MISSING_DATA',
      'CONFLICTING_SOURCES',
      'OUTDATED_REFERENCE',
      'SCHEMA_VIOLATION',
    ];

    types.forEach(type => {
      const { unmount } = render(<DiscrepancyBadge type={type} severity="medium" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      unmount();
    });
  });

  it('should handle unknown discrepancy type', () => {
    render(<DiscrepancyBadge type="UNKNOWN_TYPE" severity="high" />);

    expect(screen.getByText('UNKNOWN_TYPE')).toBeInTheDocument();
  });

  it('should have blue background for low severity', () => {
    const { container } = render(<DiscrepancyBadge type="MISSING_DATA" severity="low" />);

    expect(container.querySelector('.bg-blue-100')).toBeInTheDocument();
  });

  it('should have yellow background for medium severity', () => {
    const { container } = render(<DiscrepancyBadge type="MISSING_DATA" severity="medium" />);

    expect(container.querySelector('.bg-yellow-100')).toBeInTheDocument();
  });

  it('should have orange background for high severity', () => {
    const { container } = render(<DiscrepancyBadge type="CONTENT_MISMATCH" severity="high" />);

    expect(container.querySelector('.bg-orange-100')).toBeInTheDocument();
  });

  it('should have red background for critical severity', () => {
    const { container } = render(
      <DiscrepancyBadge type="CONFLICTING_SOURCES" severity="critical" />
    );

    expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
  });

  it('should show message as title attribute', () => {
    render(
      <DiscrepancyBadge
        type="CONTENT_MISMATCH"
        severity="high"
        message="Title does not match source"
      />
    );

    expect(screen.getByRole('status')).toHaveAttribute('title', 'Title does not match source');
  });

  it('should include message in aria-label', () => {
    render(
      <DiscrepancyBadge
        type="CONTENT_MISMATCH"
        severity="high"
        message="Title does not match source"
      />
    );

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'high severity: Content Mismatch - Title does not match source'
    );
  });

  it('should apply size variants', () => {
    const { container } = render(
      <DiscrepancyBadge type="MISSING_DATA" severity="medium" size="sm" />
    );

    expect(container.querySelector('.text-xs')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <DiscrepancyBadge type="MISSING_DATA" severity="medium" className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
