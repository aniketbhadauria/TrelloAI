import { Link } from 'react-router-dom';
import { ArrowRight, Kanban, Sparkles, Users, Zap } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Landing() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 md:py-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/60 bg-pink-50/50 px-4 py-1.5 text-sm text-pink-600 mb-8">
          <Sparkles className="w-4 h-4" />
          Now with AI-powered workflows
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.1]">
          Organize your work,{' '}
          <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            effortlessly
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          TaskFlow helps teams move work forward. Collaborate, manage projects, and reach new productivity peaks with boards, lists, and cards.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Link
            to="/boards"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 text-base px-8 h-12 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:opacity-90 transition-opacity border-0"
            )}
          >
            Open TaskFlow
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#features"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "gap-2 text-base px-8 h-12 rounded-xl"
            )}
          >
            Learn more
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-4">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              stay on track
            </span>
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-16">
            Simple, flexible, and powerful tools to manage any project from start to finish.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Kanban className="w-6 h-6" />}
              gradient="from-orange-400 to-pink-500"
              title="Kanban Boards"
              description="Visualize your workflow with drag-and-drop boards, lists, and cards that adapt to how your team works."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              gradient="from-pink-500 to-purple-500"
              title="Team Collaboration"
              description="Work together in real-time. Assign tasks, leave comments, and keep everyone aligned on priorities."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              gradient="from-purple-500 to-indigo-500"
              title="Smart Automation"
              description="Automate repetitive tasks with built-in rules. Focus on what matters while TaskFlow handles the rest."
            />
          </div>
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
    </div>
  );
}

function FeatureCard({ icon, gradient, title, description }) {
  return (
    <div className="group rounded-2xl border border-border/40 bg-white/50 p-8 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/5 hover:border-pink-200/60">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-5 shadow-md group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
