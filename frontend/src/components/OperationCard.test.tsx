import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OperationCard from './OperationCard';
import type { Operation } from '@veoendtoend/shared';

describe('OperationCard', () => {
  const baseOperation: Operation = {
    id: 'op-1',
    projectId: 'project-1',
    name: 'User Login',
    description: 'Handles user authentication',
    type: 'USER_INTERACTION',
    status: 'DISCOVERED',
    confidence: 0.85,
    sourceDocumentIds: ['doc-1'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should display operation details', () => {
    render(<OperationCard operation={baseOperation} />);

    expect(screen.getByText('User Login')).toBeInTheDocument();
    expect(screen.getByText('Handles user authentication')).toBeInTheDocument();
    expect(screen.getByText('Discovered')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm clicked', () => {
    const onConfirm = vi.fn();
    render(<OperationCard operation={baseOperation} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledWith('op-1');
  });

  it('should call onReject when reject clicked', () => {
    const onReject = vi.fn();
    render(<OperationCard operation={baseOperation} onReject={onReject} />);

    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledWith('op-1');
  });

  it('should not show confirm/reject for confirmed operations', () => {
    const confirmedOp = { ...baseOperation, status: 'CONFIRMED' as const };
    render(<OperationCard operation={confirmedOp} onConfirm={vi.fn()} onReject={vi.fn()} />);

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('should not show confirm/reject for manual operations', () => {
    const manualOp = { ...baseOperation, status: 'MANUAL' as const };
    render(<OperationCard operation={manualOp} onConfirm={vi.fn()} onReject={vi.fn()} />);

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<OperationCard operation={baseOperation} onEdit={onEdit} />);

    fireEvent.click(screen.getByTitle('Edit operation'));
    expect(onEdit).toHaveBeenCalledWith(baseOperation);
  });

  it('should call onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<OperationCard operation={baseOperation} onDelete={onDelete} />);

    fireEvent.click(screen.getByTitle('Delete operation'));
    expect(onDelete).toHaveBeenCalledWith('op-1');
  });

  it('should display different status badges', () => {
    const { rerender } = render(<OperationCard operation={baseOperation} />);
    expect(screen.getByText('Discovered')).toBeInTheDocument();

    rerender(<OperationCard operation={{ ...baseOperation, status: 'CONFIRMED' }} />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();

    rerender(<OperationCard operation={{ ...baseOperation, status: 'REJECTED' }} />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    rerender(<OperationCard operation={{ ...baseOperation, status: 'MANUAL' }} />);
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('should display operation type', () => {
    const { rerender } = render(<OperationCard operation={baseOperation} />);
    expect(screen.getByText('user interaction')).toBeInTheDocument();

    rerender(<OperationCard operation={{ ...baseOperation, type: 'API_CALL' }} />);
    expect(screen.getByText('api call')).toBeInTheDocument();
  });
});
