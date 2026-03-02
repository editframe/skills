import { DiscordLogo, GithubLogo, XLogo } from "@phosphor-icons/react";
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
              Build video with code. HTML + CSS compositions with scripting and React support. Instant preview, hyperscale rendering.
            </p>
            {/* Color bar accent */}
            <div className="flex gap-1 mt-6" aria-hidden="true">
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
              <li><Link to="/skills" className="text-sm text-white/60 hover:text-white transition-colors">Docs & Skills</Link></li>
              <li><Link to="/pricing" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Integrations</h3>
            <ul className="space-y-3">
              <li><Link to="/with/animejs" className="text-sm text-white/60 hover:text-white transition-colors">Anime.js</Link></li>
              <li><Link to="/with/svg" className="text-sm text-white/60 hover:text-white transition-colors">SVG SMIL</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><a href="https://discord.gg/qCPvzbS2QF" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">Discord</a></li>
              <li><Link to="/blog" className="text-sm text-white/60 hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/auth/register" className="text-sm text-white/60 hover:text-white transition-colors">Contact</Link></li>
              <li><a href="https://github.com/editframe/" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white transition-colors">GitHub</a></li>
              <li><a href="/llms.txt" className="text-sm text-white/60 hover:text-white transition-colors">llms.txt</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link to="/terms" className="text-sm text-white/60 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">Privacy Policy</Link></li>
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
              <XLogo className="w-5 h-5" weight="fill" />
            </a>
            <a href="https://github.com/editframe/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="GitHub">
              <GithubLogo className="w-5 h-5" weight="fill" />
            </a>
            <a href="https://discord.gg/qCPvzbS2QF" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="Discord">
              <DiscordLogo className="w-5 h-5" weight="fill" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
