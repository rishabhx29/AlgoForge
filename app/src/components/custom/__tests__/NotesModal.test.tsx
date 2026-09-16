import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotesModal } from '@/components/custom/NotesModal';

function renderModal(overrides: Partial<React.ComponentProps<typeof NotesModal>> = {}) {
  const props = {
    problemTitle: 'Two Sum',
    noteContent: 'Use a hash map',
    saving: false,
    onChange: vi.fn(),
    onSave: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };

  render(<NotesModal {...props} />);
  return props;
}

describe('NotesModal', () => {
  it('renders the problem title and current note', () => {
    renderModal();

    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Use a hash map');
  });

  it('calls onSave when the Save button is clicked', async () => {
    const { onSave } = renderModal();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('disables Save and shows progress while saving', () => {
    renderModal({ saving: true });

    const saveButton = screen.getByRole('button', { name: /saving/i });
    expect(saveButton).toBeDisabled();
  });

  it('reports textarea edits through onChange', async () => {
    const { onChange } = renderModal({ noteContent: '' });

    await userEvent.type(screen.getByRole('textbox'), 'abc');

    expect(onChange).toHaveBeenCalled();
  });

  it('closes via the close button', async () => {
    const { onClose } = renderModal();

    // The close button is the one containing the X icon (no accessible name),
    // so select it as the last button in the header row.
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[buttons.length - 1]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', async () => {
    const { onClose } = renderModal();

    // Backdrop is the sibling div rendered before the panel.
    const backdrop = document.querySelector('.fixed.inset-0 > .absolute.inset-0');
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
