'use client';

import { useEffect, useRef, useState } from 'react';

interface TocItem {
  id: string;
  title: string;
}

/**
 * Sticky left-side table of contents for the home page content sections.
 * Uses IntersectionObserver to highlight the active section on scroll.
 * Hidden below lg breakpoint.
 */
export default function HomeToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    const observer = observerRef.current;
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      window.history.pushState(null, '', `#${id}`);
      setActiveId(id);
    }
  };

  return (
    <nav aria-label="Table of contents" className="hidden lg:block">
      <div className="sticky top-28">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          On this page
        </p>
        <ul className="space-y-1 border-l border-border">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={`block py-1.5 pl-4 text-sm leading-snug transition-colors ${
                  activeId === item.id
                    ? 'border-l-2 border-foreground -ml-px font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
