export const HEADER_LAYOUT_POLICY = {
  maxWidthClassName: 'max-w-full',
  gutterClassName: 'px-4 sm:px-6',
  verticalPaddingClassName: 'py-3 sm:py-4',
} as const;

export function getGlobalHeaderGutterClassName() {
  return [
    'mx-auto',
    'flex',
    'items-center',
    'justify-between',
    'gap-3',
    HEADER_LAYOUT_POLICY.gutterClassName,
    HEADER_LAYOUT_POLICY.verticalPaddingClassName,
    HEADER_LAYOUT_POLICY.maxWidthClassName,
  ].join(' ');
}
