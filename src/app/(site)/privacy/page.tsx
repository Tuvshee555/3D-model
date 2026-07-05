import Link from "next/link";

export const metadata = { title: "Privacy — Outfit Copilot" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Privacy
      </h1>
      <p>
        <strong>Your photos.</strong> Photos you upload are used only to generate
        your try-on previews. You own your photo and the generated images. We do
        not share your images with third parties for their own use.
      </p>
      <p>
        <strong>What we store.</strong> To show you your gallery, we store the
        generated preview and the source photo on our image host (Cloudinary) and
        a record in our database. If you use the app without an account, these are
        tied to an anonymous cookie on your device.
      </p>
      <p>
        <strong>Deleting your data.</strong> You can delete all of your try-ons at
        any time from the <a className="text-[var(--color-primary)] underline-offset-2 hover:underline" href="/gallery">gallery</a>{" "}
        page. If you have an account, you can also permanently delete the whole
        account — including your stores, catalog items, and saved try-ons — from
        your <Link className="text-[var(--color-primary)] underline-offset-2 hover:underline" href="/dashboard">dashboard</Link>.
      </p>
      <p>
        <strong>AI-generated content.</strong> Previews are computer-generated and
        may not perfectly represent fit, color, or fabric. Do not upload photos of
        other people without their consent, or sensitive/explicit images.
      </p>
      <p className="text-zinc-500">
        This is a product prototype. For a production deployment, replace this
        page with your reviewed privacy policy covering your jurisdiction
        (e.g. GDPR/CCPA/Australian Privacy Principles).
      </p>
    </div>
  );
}
