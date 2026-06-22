import Link from 'next/link';

export type BreadcrumbLink = {
  readonly name: string;
  readonly href: string;
};

export default function Breadcrumbs({ items }: { readonly items: readonly BreadcrumbLink[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-supporting text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {isCurrent ? (
                <span aria-current="page" className="text-foreground">
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-brand-accent transition-colors">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
