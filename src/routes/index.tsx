import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { decryptMiiQr, readMiiName, toHexDump, CFSD_SIZE } from "@/lib/mii-qr";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mii QR to CFSD Extractor" },
      {
        name: "description",
        content:
          "Drop a Nintendo 3DS Mii QR code image and download the decrypted .cfsd Mii character file. Runs entirely in your browser.",
      },
      { property: "og:title", content: "Mii QR to CFSD Extractor" },
      {
        property: "og:description",
        content:
          "Decode a Mii QR code and download the raw .cfsd Mii record — fully offline, in your browser.",
      },
    ],
  }),
  component: Index,
});

type Result = {
  bytes: Uint8Array;
  name: string;
  fileName: string;
};

function Index() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not read the image.");
      ctx.drawImage(bitmap, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(image.data, image.width, image.height);
      if (!code) throw new Error("No QR code found in this image. Try a sharper or larger crop.");
      if (!code.binaryData || code.binaryData.length < 0x70) {
        throw new Error("QR code decoded, but it does not contain Mii data.");
      }

      const cfsd = decryptMiiQr(new Uint8Array(code.binaryData));
      const name = readMiiName(cfsd);
      setResult({
        bytes: cfsd,
        name,
        fileName: `${(name || "mii").replace(/[^\w-]+/g, "_")}.cfsd`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong reading that image.");
    } finally {
      setBusy(false);
    }
  }, []);

  const download = () => {
    if (!result) return;
    const blob = new Blob([result.bytes as unknown as BlobPart], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Mii QR code → .cfsd extractor
        </h1>
        <ThemeToggle />
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-14 text-center transition-colors ${
          dragging ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
        }`}
      >
        <p className="text-sm font-medium text-foreground">
          {busy ? "Decoding…" : "Drop a Mii QR image or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">PNG, JPG, WebP — screenshots work fine</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <section className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                {result.name || "Unnamed Mii"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {result.bytes.length} bytes · {result.fileName}
              </p>
            </div>
            <Button onClick={download}>Download .cfsd</Button>
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs text-muted-foreground">
            {toHexDump(result.bytes)}
          </pre>
        </section>
      )}
    </main>
  );
}
