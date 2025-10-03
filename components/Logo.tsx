export default function Logo({ className = "" }: { className?: string }) {
  /*
   * Render the application logo. The updated design uses the brand orange on
   * the "S" itself rather than enclosing it in a pill badge. This reduces
   * visual spacing and keeps the wordmark compact. We continue to use the
   * Trebuchet font family for a friendly, rounded feel.
   */
  return (
    <div className={`flex items-center font-bold text-xl ${className}`}>
      {/* First letter coloured in brand orange without a surrounding circle */}
      <span
        style={{ color: 'var(--color-brand)', fontFamily: 'Trebuchet MS, sans-serif' }}
      >
        S
      </span>
      {/* Remaining letters of the wordmark with minimal spacing */}
      <span
        className="ml-1"
        style={{ fontFamily: 'Trebuchet MS, sans-serif' }}
      >
        ilo
      </span>
    </div>
  );
}
