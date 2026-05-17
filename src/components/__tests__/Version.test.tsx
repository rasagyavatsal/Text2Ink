import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Version from '../Version';
import packageInfo from '../../../package.json';

describe('Version', () => {
  it('renders the correct version from package.json', () => {
    render(<Version />);
    const versionElement = screen.getByTestId('version');
    expect(versionElement.textContent).toBe(`v${packageInfo.version}`);
  });

  it('has the correct CSS classes', () => {
    render(<Version />);
    const versionElement = screen.getByTestId('version');
    expect(versionElement).toHaveClass('text-muted-foreground');
    expect(versionElement).toHaveClass('font-mono');
  });
});
