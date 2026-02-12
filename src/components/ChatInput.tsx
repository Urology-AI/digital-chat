import { useState, FormEvent } from "react";

interface ChatInputProps {
  onAsk: (question: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onAsk, disabled, placeholder = "Ask a question..." }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onAsk(value);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-4 py-3 text-sm rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50 disabled:opacity-50 backdrop-blur-sm"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="px-5 py-3 rounded-xl bg-sinai-400 text-white font-medium hover:bg-sinai-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-sinai-400/20"
        >
          Ask
        </button>
      </div>
    </form>
  );
}
