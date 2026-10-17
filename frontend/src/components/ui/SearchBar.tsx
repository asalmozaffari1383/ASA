import { useEffect, useState } from "react";

/**
 * Debounced search box. Reports the trimmed query to the parent ~300ms after the
 * user stops typing so list pages don't fire a request per keystroke.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = "جستجو...",
}: {
  value: string;
  onChange: (q: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value);

  // Keep local state in sync when the parent resets the query externally.
  useEffect(() => setText(value), [value]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (text !== value) onChange(text.trim());
    }, 300);
    return () => clearTimeout(id);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <input
        className="input pe-9"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText("");
            onChange("");
          }}
          className="absolute inset-y-0 end-2 my-auto h-6 w-6 rounded-full text-slate-400 hover:bg-slate-100"
          aria-label="پاک کردن جستجو"
        >
          ×
        </button>
      )}
    </div>
  );
}
