import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileTabBar } from "@/components/MobileTabBar";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {/* pb keeps content clear of the mobile tab bar */}
      <div className="flex flex-1 flex-col pb-16 sm:pb-0">{children}</div>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
