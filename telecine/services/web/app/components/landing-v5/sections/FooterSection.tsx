import { Link } from "react-router";

export function FooterSection() {
  return (
    <footer className="py-16 bg-[var(--card-dark-bg)] text-white border-t-4 border-[var(--poster-gold)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-8 md:gap-12 mb-12">
          {/* Logo column */}
          <div className="md:col-span-2">
            <Link to="/" className="text-2xl font-black tracking-tighter uppercase">editframe</Link>
            <p className="mt-4 text-sm text-white/60 max-w-xs">
              Build video with code. React components, instant preview, hyperscale rendering.
            </p>
            {/* Color bar accent */}
            <div className="flex gap-1 mt-6">
              <div className="w-8 h-2 bg-[var(--poster-red)]" />
              <div className="w-8 h-2 bg-[var(--poster-gold)]" />
              <div className="w-8 h-2 bg-[var(--poster-blue)]" />
              <div className="w-8 h-2 bg-[var(--poster-green)]" />
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link to="/skills" className="text-sm text-white/60 hover:text-white transition-colors">Agent Skills</Link></li>
              <li><Link to="/changelog" className="text-sm text-white/60 hover:text-white transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">Discord</a></li>
              <li><Link to="/blog" className="text-sm text-white/60 hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/auth/register" className="text-sm text-white/60 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="text-sm text-white/60 hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">
            © 2026 Editframe, Inc.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://twitter.com/editframe" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="Twitter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://discord.gg/editframe" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="Discord">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
