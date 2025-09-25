import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export default function CodeBlock({ code, language = "", className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("relative group", className)}>
      <pre className="overflow-auto rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
        <code className={cn("block whitespace-pre", language && `language-${language}`)}>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="secondary"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />} {copied ? "Kopyalandı" : "Kopyala"}
      </Button>
    </div>
  );
}
