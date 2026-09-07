// Single source of truth for the Kcretio "K" mark — swap the SVG in
// public/logo/mark.svg and every usage across the app updates at once.
export default function LogoMark({ size = 28, style, ...rest }) {
  return (
    <img
      src="/logo/mark.svg"
      alt="Kcretio"
      width={size}
      height={size}
      style={{ flexShrink: 0, display: 'block', ...style }}
      {...rest}
    />
  );
}
