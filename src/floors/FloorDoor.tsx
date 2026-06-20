// A door — the descent's connective tissue. You leave a floor through one of
// these to drop into the next era (or climb back up). CSS-drawn so it costs
// nothing; templates can restyle it per era via `className`.
type Props = {
  direction: 'down' | 'up';
  label: string;
  onActivate: () => void;
  className?: string;
};

export function FloorDoor({ direction, label, onActivate, className }: Props) {
  return (
    <button
      type="button"
      className={`floor-door floor-door--${direction}${className ? ` ${className}` : ''}`}
      onClick={onActivate}
    >
      <span className="floor-door__frame" aria-hidden="true">
        <span className="floor-door__panel" />
        <span className="floor-door__panel" />
        <span className="floor-door__knob" />
      </span>
      <span className="floor-door__label">
        {direction === 'down' ? '▼ ' : '▲ '}
        {label}
      </span>
    </button>
  );
}
