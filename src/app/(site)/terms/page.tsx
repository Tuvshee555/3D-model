export const metadata = { title: "Terms — Outfit Copilot" };

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-16 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Terms of Service
      </h1>
      <p>
        <strong>The service.</strong> Outfit Copilot generates AI previews of a
        person wearing clothing. Previews are illustrative and are not a guarantee
        of fit, sizing, color accuracy, or availability.
      </p>
      <p>
        <strong>Acceptable use.</strong> Only upload images you have the right to
        use. Do not upload images of identifiable people without their consent, or
        images that are explicit, illegal, or infringing. We may refuse to
        generate images involving public figures or copyrighted prints.
      </p>
      <p>
        <strong>Store owners.</strong> If you add a catalog and embed the widget,
        you confirm you have the rights to the product images and descriptions you
        upload. Usage is subject to your plan&apos;s monthly try-on limit.
      </p>
      <p>
        <strong>Your content.</strong> You retain ownership of images you upload
        and generate. You grant us the limited right to process and store them to
        provide the service.
      </p>
      <p className="text-zinc-500">
        This is a product prototype. Replace this page with your reviewed Terms of
        Service before any production launch.
      </p>
    </div>
  );
}
