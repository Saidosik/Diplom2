// components/publications/blocks/CopyCodeButton.tsx

"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  code: string;
};

export function CopyCodeButton({ code }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={handleCopy}
      className="h-8 text-zinc-300 hover:bg-zinc-800 hover:text-white"
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Скопировано
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          Копировать
        </>
      )}
    </Button>
  );
}