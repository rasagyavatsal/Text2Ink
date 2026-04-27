import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  SectionCard,
  SettingRow,
  SidebarTabStrip,
  SelectorCarousel,
  StatusCallout,
} from '@/components/patterns/EditorPatterns';

describe('editor pattern components', () => {
  it('renders section cards and setting rows with accessible labels and values', () => {
    render(
      <SectionCard title="Workspace" description="Navigation and zoom controls">
        <SettingRow label="Zoom" value="100%">
          <button type="button">Increase zoom</button>
        </SettingRow>
      </SectionCard>,
    );

    expect(screen.getByRole('heading', { name: /workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/navigation and zoom controls/i)).toBeInTheDocument();
    expect(screen.getByText('Zoom')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /increase zoom/i })).toBeInTheDocument();
  });

  it('keeps Settings and Export tab behavior consistent', () => {
    const onChange = vi.fn();

    render(
      <SidebarTabStrip
        activeView="settings"
        onViewChange={onChange}
        views={[
          { id: 'settings', label: 'Settings' },
          { id: 'export', label: 'Export' },
        ]}
      />,
    );

    expect(screen.getByRole('tab', { name: /settings/i })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: /export/i }));
    expect(onChange).toHaveBeenCalledWith('export');
  });

  it('provides reusable carousel paging for visual selectors', () => {
    render(
      <SelectorCarousel
        ariaLabel="Fonts"
        pageLabel="Font page"
        currentPage={0}
        totalPages={2}
        onPrevious={() => {}}
        onNext={() => {}}
      >
        <button type="button">Caveat</button>
      </SelectorCarousel>,
    );

    expect(screen.getByRole('group', { name: /fonts/i })).toBeInTheDocument();
    expect(screen.getByText(/font page 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous fonts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next fonts/i })).toBeInTheDocument();
  });

  it('announces status callouts using the requested tone', () => {
    render(<StatusCallout tone="warning">Start typing to enable export</StatusCallout>);

    expect(screen.getByRole('status')).toHaveTextContent(/start typing/i);
  });
});
