import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DesktopEditorChrome from '../DesktopEditorChrome';

function Harness() {
  const [activePanel, setActivePanel] = React.useState<'settings' | 'export'>('settings');

  return (
    <DesktopEditorChrome
      activePanel={activePanel}
      exportPanel={<div data-testid="export-panel">Export panel</div>}
      preview={<div data-testid="preview">Preview</div>}
      settingsPanel={<div data-testid="settings-panel">Settings panel</div>}
      onActivePanelChange={setActivePanel}
    />
  );
}

describe('DesktopEditorChrome', () => {
  it('renders a fixed sidebar that switches between settings and export without affecting the preview', () => {
    render(<Harness />);

    expect(screen.getByRole('complementary', { name: /editor tools/i })).toBeInTheDocument();
    expect(screen.getByTestId('preview')).toBeInTheDocument();
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /export/i }));

    expect(screen.getByTestId('preview')).toBeInTheDocument();
    expect(screen.getByTestId('export-panel')).toBeInTheDocument();
  });
});
