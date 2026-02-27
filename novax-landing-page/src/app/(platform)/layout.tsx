import { Navigation } from "@/components/ui/navigation";
import { PageTransition } from "@/components/ui/page-transition";
import { Chatbot } from "@/components/ui/chatbot";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
        {/* Subtle background glow for the internal app area */}
      <div className="fixed top-0 right-0 w-[50vw] h-[50vh] bg-[radial-gradient(circle,rgba(0,255,136,0.03)_0%,transparent_70%)] pointer-events-none -z-10 blur-3xl" />
      
      <Navigation />
      <main className="flex-1 ml-64 p-8">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <Chatbot />
    </div>
  );
}
