import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OperationsList from './OperationsList';
import type { Operation } from '@veoendtoend/shared';

describe('OperationsList', () => {
  const mockOperations: Operation[] = [
    {
      id: 'op-1',
      projectId: 'project-1',
      name: 'User Login',
      description: 'Auth flow',
      type: 'USER_INTERACTION',
      status: 'DISCOVERED',
      confidence: 0.9,
      sourceDocumentIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'op-2',
      projectId: 'project-1',
      name: 'Fetch Data',
      description: 'API call',
      type: 'API_CALL',
      status: 'CONFIRMED',
      confidence: 0.8,
      sourceDocumentIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'op-3',
      projectId: 'project-1',
      name: 'Custom Op',
      description: 'Manual',
      type: 'CLIENT_OPERATION',
      status: 'MANUAL',
      confidence: 1,
      sourceDocumentIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('should display loading state', () => {
    render(<OperationsList operations={[]} loading={true} />);
    expect(screen.getByText('Loading operations...')).toBeInTheDocument();
  });

  it('should display operations', () => {
    render(<OperationsList operations={mockOperations} />);

    expect(screen.getByText('User Login')).toBeInTheDocument();
    expect(screen.getByText('Fetch Data')).toBeInTheDocument();
    expect(screen.getByText('Custom Op')).toBeInTheDocument();
  });

  it('should show empty state when no operations', () => {
    render(<OperationsList operations={[]} />);
    expect(screen.getByText('No operations yet')).toBeInTheDocument();
  });

  it('should show add button when onAddManual provided', () => {
    const onAddManual = vi.fn();
    render(<OperationsList operations={[]} onAddManual={onAddManual} />);

    expect(screen.getByText('Add Operation')).toBeInTheDocument();
  });

  it('should call onAddManual when Add Operation clicked', () => {
    const onAddManual = vi.fn();
    render(<OperationsList operations={mockOperations} onAddManual={onAddManual} />);

    fireEvent.click(screen.getByText('Add Operation'));
    expect(onAddManual).toHaveBeenCalled();
  });

  it('should filter by status', () => {
    const { container } = render(<OperationsList operations={mockOperations} />);

    // Get filter buttons
    const filterButtons = container.querySelectorAll('.flex.gap-2 > button');
    const discoveredButton = Array.from(filterButtons).find(b => b.textContent?.includes('Discovered'));
    const confirmedButton = Array.from(filterButtons).find(b => b.textContent?.includes('Confirmed'));
    const allButton = Array.from(filterButtons).find(b => b.textContent?.includes('All'));

    // Click on Discovered filter
    fireEvent.click(discoveredButton!);
    expect(screen.getByText('User Login')).toBeInTheDocument();
    expect(screen.queryByText('Fetch Data')).not.toBeInTheDocument();
    expect(screen.queryByText('Custom Op')).not.toBeInTheDocument();

    // Click on Confirmed filter
    fireEvent.click(confirmedButton!);
    expect(screen.queryByText('User Login')).not.toBeInTheDocument();
    expect(screen.getByText('Fetch Data')).toBeInTheDocument();

    // Click on All filter
    fireEvent.click(allButton!);
    expect(screen.getByText('User Login')).toBeInTheDocument();
    expect(screen.getByText('Fetch Data')).toBeInTheDocument();
    expect(screen.getByText('Custom Op')).toBeInTheDocument();
  });

  it('should display status counts in filter buttons', () => {
    const { container } = render(<OperationsList operations={mockOperations} />);

    // Check filter buttons contain expected text
    const filterButtons = container.querySelectorAll('.flex.gap-2 > button');
    const buttonTexts = Array.from(filterButtons).map(b => b.textContent);

    expect(buttonTexts.some(t => t?.includes('All') && t?.includes('(3)'))).toBe(true);
    expect(buttonTexts.some(t => t?.includes('Discovered') && t?.includes('(1)'))).toBe(true);
    expect(buttonTexts.some(t => t?.includes('Confirmed') && t?.includes('(1)'))).toBe(true);
    expect(buttonTexts.some(t => t?.includes('Manual') && t?.includes('(1)'))).toBe(true);
  });

  it('should call onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(<OperationsList operations={mockOperations} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledWith('op-1');
  });

  it('should call onReject when reject button clicked', () => {
    const onReject = vi.fn();
    render(<OperationsList operations={mockOperations} onReject={onReject} />);

    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledWith('op-1');
  });

  it('should show link to add first operation in empty state', () => {
    const onAddManual = vi.fn();
    render(<OperationsList operations={[]} onAddManual={onAddManual} />);

    const addLink = screen.getByText('Add your first operation');
    fireEvent.click(addLink);
    expect(onAddManual).toHaveBeenCalled();
  });
});
