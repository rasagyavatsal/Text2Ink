import packageInfo from '../../package.json';

export default function Version() {
  return (
    <span className="text-muted-foreground text-[10px] sm:text-xs font-mono" data-testid="version">
      v{packageInfo.version}
    </span>
  );
}
