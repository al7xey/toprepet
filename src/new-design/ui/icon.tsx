export function Icon({ name, style }: { name: string; style?: React.CSSProperties }) {
  return <i className={`i i-${name}`} aria-hidden="true" style={style} />;
}
