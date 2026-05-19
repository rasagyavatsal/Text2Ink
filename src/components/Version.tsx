import packageInfo from '../../package.json';

export default function Version() {
  return (
    <span className="text-muted-foreground text-label sm:text-xs font-mono" data-testid="version">
      v{packageInfo.version}
    </span>
  );
}
