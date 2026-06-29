export function BlurredText({ placeholder = '████████ ████ ██████' }: { placeholder?: string }) {
  return (
    <span className="select-none blur-sm" aria-hidden>
      {placeholder}
    </span>
  );
}
