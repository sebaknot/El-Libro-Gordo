export const metadata = { title: "Terms & Conditions — One Insurance" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-slate">
        One Insurance — SMS &amp; WhatsApp messaging terms · Last updated August 2026
      </p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-ink">Messaging program</h2>
          <p className="mt-2">
            By opting in, you agree to receive SMS or WhatsApp messages from{" "}
            One Insurance about your insurance coverage: renewal
            reminders, requests to verify your application information, and policy
            servicing updates. Consent is not a condition of purchasing any
            insurance product.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Message frequency</h2>
          <p className="mt-2">
            Message frequency varies — typically 1–4 messages per year, around your
            policy renewal.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Rates</h2>
          <p className="mt-2">Message and data rates may apply.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Help and opt-out</h2>
          <p className="mt-2">
            Reply <strong>HELP</strong> for help, or contact{" "}
            <a href="mailto:insurancecoverage@icloud.com" className="text-sapphire underline">
              insurancecoverage@icloud.com
            </a>
            . Reply <strong>STOP</strong> at any time to unsubscribe. See our{" "}
            <a href="/privacy" className="text-sapphire underline">
              Privacy Policy
            </a>{" "}
            for how your information is handled.
          </p>
        </section>
      </div>
    </main>
  );
}
