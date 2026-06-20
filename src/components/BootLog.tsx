import '../styles/boot.css';

// Presentational PIZZA-DOS boot/POST log — black screen, green phosphor text,
// blinking cursor. Used as the "loading the world" screen during the descent
// (it no longer gates the storefront; the front door loads instantly).
export function BootLog({ lines }: { lines: string[] }) {
  return (
    <pre className="boot__log">
      {lines.join('\n')}
      <span className="boot__cursor"> _</span>
    </pre>
  );
}
