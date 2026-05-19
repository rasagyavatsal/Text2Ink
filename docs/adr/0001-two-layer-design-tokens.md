# Two-layer design tokens across the codebase

Text2Ink is expanding **Design Tokens** from theme-only values to a site-wide system that also owns shared layout values. We will use a two-layer token model across the entire codebase: primitive tokens define reusable scales for colors, spacing, radii, sizes, and breakpoints, semantic tokens map those primitives to layout, surface, and control intent, Tailwind remains the primary token-consumption layer, and raw CSS variables are reserved for edge cases such as dynamic measurements and specialized layout calculations.
