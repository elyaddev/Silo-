export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`font-bold tracking-tight ${className}`}>
      <span className="px-2 py-1 rounded-xl bg-black text-white dark:bg-white dark:text-black">AC</span>
      <span className="ml-2">Athlete Chat</span>
    </div>
  );
}
