import {
  Github,
  Twitter,
  Linkedin,
  Mail,
  MapPin
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

// Footer component - onNavigate prop reserved for future use
type ViewType = 'home' | 'dashboard' | 'topic' | 'problems' | 'notes' | 'leaderboard' | 'docs' | 'api';

interface FooterProps {
  onNavigate: (_view: ViewType) => void;
}

const footerLinks = {
  product: [
    { label: 'Roadmaps', href: '#roadmaps' },
    { label: 'Problems', href: '#problems' },
    { label: 'Leaderboard', href: '#leaderboard' },
  ],
  resources: [
    { label: 'Documentation', href: '#docs', description: 'Getting started guides' },
    { label: 'API Reference', href: '#api', description: 'REST API endpoints' },
    { label: 'Community', href: '#community', description: 'Discussion forum' },
  ]
};

const socialLinks = [
  { icon: Github, href: 'https://github.com/Rishabhworkspace/AlgoForge-2.0', label: 'GitHub' },
  { icon: Linkedin, href: 'https://www.linkedin.com/in/rishabh-tripathi-728a77317', label: 'LinkedIn' },
  { icon: Twitter, href: 'https://x.com/RishabhTri8805', label: 'Twitter' },
];

export function Footer({ onNavigate }: FooterProps) {
  // Use onNavigate for footer navigation links
  const handleNavClick = (view: ViewType) => {
    onNavigate(view);
  };

  return (
    <footer className="relative pt-20 pb-8">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-[6px] bg-[#222225] flex items-center justify-center border border-[rgba(241,238,234,0.1)]">
                <Logo className="w-6 h-6" />
              </div>
              <span className="font-display text-2xl text-[#f1eeea]">AlgoForge</span>
            </div>
            <p className="text-[#b6b1ad] text-[0.875rem] leading-relaxed mb-6 max-w-xs">
              Master coding, one step at a time. Structured learning paths for DSA,
              interview prep, and beyond.
            </p>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-[4px] flex items-center justify-center bg-[#222225] border border-[rgba(241,238,234,0.1)] hover:bg-[#2c2b30] transition-colors group"
                >
                  <social.icon className="w-5 h-5 text-[#b6b1ad] group-hover:text-[#f1eeea] transition-colors" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-medium text-[#f1eeea] mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      if (link.label === 'Roadmaps') {
                        e.preventDefault();
                        handleNavClick('topic');
                      } else if (link.label === 'Problems') {
                        e.preventDefault();
                        handleNavClick('problems');
                      } else if (link.label === 'Leaderboard') {
                        e.preventDefault();
                        handleNavClick('leaderboard');
                      }
                    }}
                    className="text-[0.875rem] text-[#b6b1ad] hover:text-[#f1eeea] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-medium text-[#f1eeea] mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      if (link.label === 'Documentation') { e.preventDefault(); handleNavClick('docs'); }
                      else if (link.label === 'API Reference') { e.preventDefault(); handleNavClick('api'); }
                    }}
                    className="text-[0.875rem] text-[#b6b1ad] hover:text-[#f1eeea] transition-colors block"
                  >
                    {link.label}
                    <span className="block text-[0.75rem] text-[#8f8a85]">{link.description}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>



          {/* Contact Info */}
          <div>
            <h4 className="font-medium text-[#f1eeea] mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-[0.875rem] text-[#b6b1ad]">
                <Mail className="w-4 h-4" aria-hidden="true" />
                rishabh.j.tripathi2903@gmail.com
              </li>
              <li className="flex items-start gap-2 text-[0.875rem] text-[#b6b1ad]">
                <MapPin className="w-4 h-4 mt-0.5" aria-hidden="true" />
                Chennai, Tamil Nadu
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[rgba(241,238,234,0.2)] flex items-center justify-center">
          <p className="text-[0.875rem] text-[#8f8a85]">
            © {new Date().getFullYear()} AlgoForge. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
