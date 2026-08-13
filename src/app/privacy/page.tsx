export const metadata = { title: "Privacy Policy — One Insurance" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate">One Insurance · Last updated August 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-ink">Information we collect</h2>
          <p className="mt-2">
            One Insurance collects client contact information — name, phone
            number, email address, and mailing address — along with the household and
            policy details needed to service your insurance coverage. If you opt in to
            SMS or WhatsApp messages, we record your phone number and your consent to
            be contacted on that channel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">How we use your information</h2>
          <p className="mt-2">
            Your information is used solely for insurance policy servicing: renewal
            reminders, requests to verify or update your application information,
            and messages about your existing coverage. We do not use your information
            for any unrelated marketing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Sharing</h2>
          <p className="mt-2">
            Your phone number and contact information are <strong>never sold</strong>{" "}
            and never shared with third parties for their marketing purposes. No
            mobile opt-in data is shared with third parties or affiliates for
            marketing or promotional purposes. Information is shared only with
            insurance carriers and government marketplaces as required to service
            your policy, or when the law requires it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Opting out</h2>
          <p className="mt-2">
            You can stop receiving text messages at any time — reply{" "}
            <strong>STOP</strong> to unsubscribe. Opting out of messages does not
            affect your insurance coverage. For help, reply <strong>HELP</strong> or
            email{" "}
            <a href="mailto:insurancecoverage@icloud.com" className="text-sapphire underline">
              insurancecoverage@icloud.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Contact</h2>
          <p className="mt-2">
            Questions about this policy or your data? Contact One Insurance at{" "}
            <a href="mailto:insurancecoverage@icloud.com" className="text-sapphire underline">
              insurancecoverage@icloud.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
