import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, LayoutDashboard, Globe, MessageCircle, Briefcase } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Footer } from '@/components/ui/footer';
import { Logos3 } from '@/components/ui/logos3';
import { FloatingIconsHero, defaultHeroIcons } from '@/components/ui/floating-icons-hero-section';
import { GlobeFeatureSection } from '@/components/ui/globe-feature-section';
import { cn } from '@/lib/utils';

export default function Landing() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <FloatingIconsHero
        title="Organize your work, effortlessly"
        subtitle="TaskFlow helps teams move work forward. Collaborate, manage projects, and reach new productivity peaks with boards, lists, and cards."
        ctaText="Open TaskFlow"
        ctaHref="/boards"
        icons={defaultHeroIcons}
        badge={
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/60 bg-pink-50/50 px-4 py-1.5 text-sm text-pink-600">
            <Sparkles className="w-4 h-4" />
            Now with AI-powered workflows
          </div>
        }
      />

      {/* Logo Carousel */}
      <Logos3 heading="Trusted by these companies" />

      {/* Features */}
      <section id="features" className="px-4 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <GlobeFeatureSection
            title={<>Build with <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500">TaskFlow</span></>}
            description="Empower your team with fast, elegant, and scalable project management. TaskFlow brings simplicity and performance to your modern workflow — from anywhere in the world."
            ctaText="Get Started"
            ctaHref="/boards"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Jump into your workspace and start organizing your projects in seconds.
          </p>
          <Link
            to="/boards"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 text-base px-10 h-12 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:opacity-90 transition-opacity border-0"
            )}
          >
            Go to Boards
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer
        logo={
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 flex items-center justify-center shadow-md shadow-pink-500/20">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
        }
        brandName="TaskFlow"
        socialLinks={[
          { icon: <MessageCircle className="h-5 w-5" />, href: "https://twitter.com", label: "Twitter" },
          { icon: <Globe className="h-5 w-5" />, href: "https://github.com", label: "GitHub" },
          { icon: <Briefcase className="h-5 w-5" />, href: "https://linkedin.com", label: "LinkedIn" },
        ]}
        mainLinks={[
          { href: "#features", label: "Features" },
          { href: "/boards", label: "Boards" },
          { href: "#", label: "Pricing" },
          { href: "#", label: "Blog" },
          { href: "#", label: "Contact" },
        ]}
        legalLinks={[
          { href: "#", label: "Privacy Policy" },
          { href: "#", label: "Terms of Service" },
        ]}
        copyright={{
          text: `© ${new Date().getFullYear()} TaskFlow`,
          license: "All rights reserved",
        }}
      />
    </div>
  );
}

