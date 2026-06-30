//
export function BlurredText({ placeholder = 'Warmup Ventures' }: { placeholder?: string }) {
  return (
    <span className="select-none text-gray-400 blur-[3px] opacity-90 font-medium" aria-hidden>
      {placeholder}
    </span>
  );
}
