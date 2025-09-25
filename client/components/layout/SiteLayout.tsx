import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Github, Laptop, Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface SiteLayoutProps {
  children: ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 text-foreground">
      <header
        className={cn(
          "sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b",
        )}
      >
        <div className="container mx-auto flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              {/* simple brand mark */}
              <Monitor className="size-4" />
            </span>
            PiStream
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-primary">
              Özellikler
            </a>
            <a href="#code" className="hover:text-primary">
              Kod
            </a>
            <a href="#platforms" className="hover:text-primary">
              Platformlar
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="#download">
              <Button size="sm" variant="secondary">
                İndir
              </Button>
            </a>
            <a
              href="https://builder.io/c/docs/projects"
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="sm"
                variant="ghost"
                className="hidden md:inline-flex"
              >
                <Github className="mr-2" />
                Docs
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t mt-16">
        <div className="container mx-auto py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} PiStream • C/C++ ile ekran paylaşımı
            (VNC benzeri)
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Smartphone className="size-4" /> APK
            </span>
            <span className="inline-flex items-center gap-1">
              <Laptop className="size-4" /> EXE/MSI
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
