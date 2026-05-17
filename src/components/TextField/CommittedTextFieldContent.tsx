'use client';

import React, { useMemo } from 'react';
import { layoutTextFieldContent, TEXT_FIELD_CONTENT_PADDING } from '@/lib/textFieldLayout';
import type { TextField as TextFieldType } from '@/lib/types';

interface CommittedTextFieldContentProps {
  field: TextFieldType;
  fontFamily: string;
  scale: number;
  lineDataPageLayer?: string;
}

export default function CommittedTextFieldContent({
  field,
  fontFamily,
  scale,
  lineDataPageLayer,
}: CommittedTextFieldContentProps) {
  const layout = useMemo(
    () => layoutTextFieldContent({
      text: field.text,
      fontSize: field.fontSize,
      fontFamily,
      width: field.width,
    }),
    [field.fontSize, field.text, field.width, fontFamily],
  );
  const contentInset = TEXT_FIELD_CONTENT_PADDING * scale;
  const contentWidth = Math.max(0, (field.width - TEXT_FIELD_CONTENT_PADDING * 2) * scale);

  return (
    <div
      data-text-field-layer="committed-content"
      className="relative h-full w-full"
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: contentInset,
          top: contentInset,
          width: contentWidth,
          height: '100%',
        }}
      >
        {layout.lines.map((line, index) => (
          <div
            key={`${index}-${line.top}`}
            data-text-field-layer="committed-line"
            data-page-layer={lineDataPageLayer}
            style={{
              position: 'absolute',
              top: line.top * scale,
              left: 0,
              width: contentWidth,
              height: layout.lineHeight * scale,
              fontSize: field.fontSize * scale,
              lineHeight: `${layout.lineHeight * scale}px`,
              whiteSpace: 'pre',
            }}
          >
            {line.text || '\u00a0'}
          </div>
        ))}
      </div>
    </div>
  );
}
