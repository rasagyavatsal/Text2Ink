import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../dialog';
import { CHROME_LAYER_Z_INDEX } from '@/lib/designSystem';

describe('editor surface layer primitives', () => {
  it('renders popovers on the floating surface layer', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Floating content</PopoverContent>
      </Popover>,
    );

    const content = await screen.findByText('Floating content');
    expect(content.closest('[data-slot="popover-content"]')).toHaveStyle({
      zIndex: CHROME_LAYER_Z_INDEX.floatingSurface,
    });
  });

  it('renders dialog overlay and content on the modal dialog layer', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal title</DialogTitle>
            <DialogDescription>Modal description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveStyle({
      zIndex: CHROME_LAYER_Z_INDEX.modalDialog,
    });
    expect(screen.getByRole('dialog')).toHaveStyle({
      zIndex: CHROME_LAYER_Z_INDEX.modalDialog,
    });
  });
});
