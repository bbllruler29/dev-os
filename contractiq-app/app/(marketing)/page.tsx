import { FileSearch, ShieldCheck, MessageSquareText } from 'lucide-react'

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Key terms, extracted',
    description:
      'Upload an NDA or MSA and get the terms that matter — parties, obligations, liability caps — with the exact page they came from.',
  },
  {
    icon: ShieldCheck,
    title: 'Confidence you can verify',
    description:
      'Every extracted value carries a confidence score and the source sentence behind it, so nothing is a black box.',
  },
  {
    icon: MessageSquareText,
    title: 'Ask the contract questions',
    description:
      'Chat in plain English and get answers grounded in the document text, with page citations you can jump to.',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-lg py-md">
          <span className="text-h4 font-semibold text-text-primary">ContractIQ</span>
          <a
            href="/login"
            className="rounded-input border border-border-strong px-md py-sm text-body text-text-primary transition-colors hover:border-brand-primary"
          >
            Sign In
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-lg py-3xl text-center">
        <h1 className="mx-auto max-w-3xl text-display text-text-primary">
          Review NDAs and MSAs in minutes, not hours
        </h1>
        <p className="mx-auto mt-md max-w-2xl text-body-lg text-text-secondary">
          ContractIQ extracts key terms with page-level attribution and confidence scoring, then
          lets you ask follow-up questions about the document in plain English.
        </p>
        <div className="mt-xl flex items-center justify-center gap-md">
          <a
            href="/signup"
            className="rounded-input bg-brand-primary px-xl py-sm text-body-lg font-semibold text-white transition-colors hover:bg-brand-primary-hover"
          >
            Get Started Free
          </a>
          <a
            href="#features"
            className="rounded-input border border-border-strong px-xl py-sm text-body-lg text-text-primary transition-colors hover:border-brand-primary"
          >
            See how it works
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-lg pb-3xl">
        <div className="grid gap-lg md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-card border border-border bg-surface-elevated p-lg"
            >
              <Icon size={18} strokeWidth={1.5} className="text-brand-primary" />
              <h3 className="mt-md text-h4 text-text-primary">{title}</h3>
              <p className="mt-sm text-body text-text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
