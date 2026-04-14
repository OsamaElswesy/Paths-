import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CheckCircle, Shield, TrendingUp, Users, ArrowRight, Star } from "lucide-react";
import Image from "next/image"; // Assuming future use, or just use placeholders

export default function Home() {
  return (
    <div className="flex flex-col overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-200/30 rounded-full blur-[120px] -z-10 mix-blend-multiply opacity-70 animate-float" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] -z-10 mix-blend-multiply opacity-70" />
        <div className="absolute top-20 left-10 w-24 h-24 bg-purple-200 rounded-full blur-2xl -z-10 opacity-60" />

        <div className="container px-6 relative z-10 text-center">

          <div className="animate-fade-in-up">
            <Badge variant="primary" className="mb-8 px-4 py-1.5 text-sm bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm">
              <span className="mr-2">✨</span> Introducing AI-Driven Shortlists
            </Badge>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 max-w-4xl mx-auto tracking-tight animate-fade-in-up delay-100 leading-[1.1]">
            Hire fairly. <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Faster.</span><br />
            <span className="text-indigo-600">With PATHS.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-slate-500 mb-12 leading-relaxed animate-fade-in-up delay-200">
            The next-generation recruitment platform that eliminates bias and accelerates hiring.
            Automated 9-step workflows delivered through a premium AI experience.
          </p>

          <div className="flex flex-wrap justify-center gap-5 animate-fade-in-up delay-300">
            <Link href="/login">
              <Button size="lg" className="h-14 px-10 rounded-full text-lg shadow-2xl shadow-indigo-500/30 bg-indigo-600 hover:bg-indigo-500 transition-all hover:-translate-y-1">
                Get Started <ArrowRight size={20} className="ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-14 px-10 rounded-full text-lg bg-white/50 backdrop-blur-sm border-slate-200 hover:bg-white hover:border-slate-300">
                Request Demo
              </Button>
            </Link>
          </div>

          {/* Dashboard Preview Reimagined */}
          <div className="mt-24 relative max-w-6xl mx-auto animate-fade-in-up delay-400">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2.5rem] blur-2xl opacity-20"></div>
            <div className="relative rounded-[2rem] border border-slate-200/60 bg-white shadow-2xl overflow-hidden shadow-indigo-500/10">
              <div className="h-12 border-b border-slate-100 bg-slate-50/80 flex items-center px-6 gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="mx-auto bg-white border rounded-md px-4 py-1 text-[10px] text-slate-400 font-medium select-none">
                  paths.recuit/dashboard/engineering-lead
                </div>
              </div>
              <Image
                src="/images/hero.png"
                alt="PATHS Dashboard"
                width={1200}
                height={675}
                className="w-full object-cover"
                priority
              />
            </div>

            {/* Floating Elements */}
            <div className="absolute -right-12 top-1/4 glass-card p-5 rounded-2xl shadow-2xl animate-float delay-100 hidden lg:block border border-white/40 ring-1 ring-slate-900/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20">98%</div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Top match</p>
                  <p className="font-bold text-slate-900">Engineering Lead</p>
                </div>
              </div>
            </div>

            <div className="absolute -left-12 bottom-1/4 glass-card p-5 rounded-2xl shadow-2xl animate-float delay-300 hidden lg:block border border-white/40 ring-1 ring-slate-900/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Star size={24} fill="white" stroke="none" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Decision</p>
                  <p className="font-bold text-slate-900">Approved for Offer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Split Section */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="container px-6 grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 px-4 py-1 rounded-full uppercase text-[10px] font-bold tracking-widest">Bias-Free Architecture</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              Evaluations driven by <span className="text-gradient">data, not details.</span>
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              Our unique 9-step workflow enforces managed anonymity until the Reveal stage.
              Evaluate candidates based solely on their rubric alignment, technical skills, and cultural fit score.
            </p>
            <ul className="space-y-4">
              {[
                "Anonymized profiles until Step 5",
                "Score-based ranking to eliminate bias",
                "Structured rubric for all evaluations",
                "Automated outreach & scheduling"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                    <CheckCircle size={14} />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative group">
            <div className="absolute -inset-4 bg-indigo-500/10 blur-[100px] rounded-full pointing-events-none group-hover:bg-indigo-500/20 transition-all"></div>
            <div className="relative rounded-3xl border-2 border-slate-100 shadow-2xl overflow-hidden rotate-2 group-hover:rotate-0 transition-all duration-500 bg-white">
              <Image src="/images/feature-bias.png" alt="Bias free screening" width={800} height={600} className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="bg-slate-50 py-32 relative">
        <div className="container px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl font-bold text-slate-900">Redefining the Standard</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">Modern teams need modern tools. We dropped the legacy baggage to build something pure.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Bias-Free Hiring", desc: "Anonymized candidate profiles ensure skills are evaluated without unconscious bias." },
              { icon: TrendingUp, title: "Top-K Recommendations", desc: "AI-powered scoring instantly identifies the top candidates based on strict rubric matching." },
              { icon: Users, title: "Collaborative Decisions", desc: "Streamlined approval flows and collaborative tools for faster alignment." }
            ].map((item, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ring-1 ring-slate-900/5">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/40 transition-all duration-500">
                  <item.icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof ... */}
      <section className="py-24 container px-6 border-b border-slate-100">
        <p className="text-center text-slate-400 font-bold mb-12 uppercase tracking-[0.2em] text-[10px]">Trusted by hiring elites at</p>
        <div className="flex flex-wrap justify-center gap-x-20 gap-y-10 opacity-30 grayscale contrast-125">
          {['Acme Corp', 'Global Dynamics', 'Soylent Corp', 'Umbrella Inc', 'Stark Ind'].map(name => (
            <span key={name} className="text-2xl font-black text-slate-800 tracking-tighter">{name}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <div className="container">
          <div className="relative rounded-[3rem] bg-slate-900 overflow-hidden px-8 py-24 text-center shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/20 blur-[150px] rounded-full pointing-events-none"></div>

            <div className="relative z-10 max-w-3xl mx-auto space-y-10">
              <h2 className="text-5xl md:text-6xl font-bold text-white tracking-tight">Ready to transform your hiring?</h2>
              <p className="text-slate-400 text-xl leading-relaxed">Join hundreds of companies hiring the best talent, faster and fairer. Experience the PATHS workflow today.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-5 pt-4">
                <Link href="/login">
                  <Button size="lg" className="bg-indigo-500 hover:bg-indigo-400 text-white border-0 h-16 px-12 text-lg rounded-full shadow-2xl shadow-indigo-500/20">Start Free Trial</Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-white/10 hover:text-white h-16 px-12 text-lg rounded-full">Contact Sales</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
