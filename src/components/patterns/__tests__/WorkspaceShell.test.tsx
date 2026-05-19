import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WorkspaceShell from '../WorkspaceShell';

describe('WorkspaceShell', () => {
  it('renders top controls, settings, and canvas', () => {
    const { container } = render(
      <WorkspaceShell
        topControls={<div data-testid="top-controls">Top</div>}
        settings={<div data-testid="settings">Settings</div>}
        canvas={<div data-testid="canvas">Canvas</div>}
      />
    );

    expect(screen.getByTestId('top-controls')).toBeInTheDocument();
    expect(screen.getByTestId('settings')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toBeInTheDocument();

    const shell = container.firstElementChild;
    const topControlsLayer = shell?.querySelector('.fixed');
    const workspaceLane = shell?.querySelector('.flex.h-full');

    expect(topControlsLayer?.className).toContain('xl:left-96');
    expect(workspaceLane?.className).not.toContain('pt-[60px]');
    expect(workspaceLane?.className).not.toContain('xl:pt-[68px]');
  });
});
