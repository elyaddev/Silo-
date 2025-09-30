export default function ContactPage() {
  return (
    <section className="max-w-lg">
      <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
      <p className="mt-2 opacity-80">Have feedback or want early access? Drop your email.</p>
      <form className="mt-6 grid gap-3">
        <input type="email" required placeholder="you@example.com" className="rounded-xl border px-3 py-2" />
        <textarea placeholder="Your message" rows={4} className="rounded-xl border px-3 py-2" />
        <button type="submit" className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold border hover:shadow w-fit">
          Send
        </button>
      </form>
    </section>
  );
}
