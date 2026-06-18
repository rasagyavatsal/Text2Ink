import React from 'react';
import { vi } from 'vitest';

// Mock lucide-react icons with a standard object mock
vi.mock('lucide-react', () => {
  const MockIcon = (props: any) => <div {...props} />;
  return {
    Type: MockIcon,
    Palette: MockIcon,
    FileText: MockIcon,
    Wand2: MockIcon,
    Upload: MockIcon,
    X: MockIcon,
    Minus: MockIcon,
    Plus: MockIcon,
    ChevronLeft: MockIcon,
    ChevronRight: MockIcon,
    ChevronDownIcon: MockIcon,
    ChevronUpIcon: MockIcon,
    CheckIcon: MockIcon,
    Trash2: MockIcon,
    Settings2: MockIcon,
    Grid: MockIcon,
    Sliders: MockIcon,
  };
});

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ unoptimized: _unoptimized, ...props }: any) => <img alt="" {...props} />,
}));
