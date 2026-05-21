import packageInfo from '../../package.json';

export default function Version() {
  return (
    <span className="text-caption text-muted-foreground font-mono" data-testid="version">
      v{packageInfo.version}
    </span>
  );
}
