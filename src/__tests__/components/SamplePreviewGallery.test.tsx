import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SamplePreviewGallery from '@/components/SamplePreviewGallery';

describe('SamplePreviewGallery', () => {
  it('opens and closes preview modal', async () => {
    const user = userEvent.setup();

    render(<SamplePreviewGallery />);

    const openButtons = screen.getAllByRole('button', {
      name: /Open Sample handwriting preview/i,
    });

    await user.click(openButtons[0]!);

    expect(screen.getByRole('dialog', { name: 'Sample preview image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Sample preview image' })).not.toBeInTheDocument();
  });

  it('zoom controls update zoom label', async () => {
    const user = userEvent.setup();

    render(<SamplePreviewGallery />);

    await user.click(
      screen.getAllByRole('button', {
        name: /Open Sample handwriting preview/i,
      })[0]!
    );

    expect(screen.getByText('100%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));

    expect(screen.getByText('125%')).toBeInTheDocument();
  });
});
