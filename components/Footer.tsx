// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <div className="font-semibold">Athlete Chat</div>
          <p className="text-sm text-gray-600">
            Tools and rooms for student-athletes.
          </p>
        </div>

        <nav className="text-sm">
          <div className="font-medium mb-2">Product</div>
          <ul className="space-y-1 text-gray-600">
            <li><a className="hover:text-gray-900" href="/">Home</a></li>
            <li><a className="hover:text-gray-900" href="/rooms">Rooms</a></li>
            <li><a className="hover:text-gray-900" href="/silo-pro">Silo-Pro</a></li>
            <li><a className="hover:text-gray-900" href="/contact">Contact</a></li>
          </ul>
        </nav>

        <div className="text-sm">
          <div className="font-medium mb-2">Stay in touch</div>
          <ul className="space-y-1 text-gray-600">
            <li><a className="hover:text-gray-900" href="mailto:hello@athletechat.app">hello@athletechat.app</a></li>
            <li><a className="hover:text-gray-900" href="#">X / Twitter</a></li>
            <li><a className="hover:text-gray-900" href="#">Instagram</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 text-xs text-gray-500 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Athlete Chat. All rights reserved.</span>
          <div className="space-x-4">
            <a className="hover:text-gray-700" href="#">Terms</a>
            <a className="hover:text-gray-700" href="#">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
