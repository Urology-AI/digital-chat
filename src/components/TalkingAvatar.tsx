/**
 * Immersive talking avatar - eavatar / LiveAvatar style.
 * Large, centered, with spotlight and glow.
 */
interface TalkingAvatarProps {
  imageUrl: string;
  name: string;
  isSpeaking: boolean;
}

export function TalkingAvatar({ imageUrl, name, isSpeaking }: TalkingAvatarProps) {
  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px] shrink-0 animate-float">
      {/* Outer glow ring when speaking */}
      <div
        className={`absolute -inset-4 rounded-full transition-all duration-500 ${
          isSpeaking ? "opacity-60" : "opacity-20"
        }`}
        style={{
          background: "radial-gradient(circle, rgba(0, 174, 239, 0.3) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Avatar container - soft border, immersive frame */}
      <div
        className={`relative w-full h-full rounded-full overflow-hidden transition-all duration-500 ${
          isSpeaking
            ? "ring-4 ring-sinai-400/60 shadow-2xl scale-[1.02]"
            : "ring-2 ring-white/20 shadow-xl"
        }`}
      >
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover object-top"
        />
      </div>

      {/* Subtle ambient pulse when speaking */}
      {isSpeaking && (
        <div
          className="absolute inset-0 rounded-full animate-glow-pulse pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(0, 174, 239, 0.1) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
