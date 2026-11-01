import { siteUrl } from "@/lib/site";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { dictionaries, isLocale, locales } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-static";
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  const t = dictionaries[locale];
  const [font, script, photo] = await Promise.all([
    readFile(join(process.cwd(), "public/assets/manrope-regular.ttf")),
    readFile(join(process.cwd(), "public/assets/allura.ttf")),
    readFile(join(process.cwd(), "public/assets/clothes.jpg")),
  ]);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#faf8f5",
        color: "#382e36",
        fontFamily: "Manrope",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 690,
          padding: "56px 64px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontFamily: "Allura", fontSize: 106, color: "#704663" }}>
          El_Inside
        </div>
        <div style={{ display: "flex", fontSize: 44, lineHeight: 1.25 }}>
          {t.pageTitle.split(" | ")[0]}
        </div>
        <div style={{ fontSize: 24, color: "#786775" }}>
          {siteUrl().hostname}
        </div>
      </div>
      {/* ImageResponse embeds the original asset directly in the generated PNG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/jpeg;base64,${photo.toString("base64")}`}
        alt={t.clothesAlt}
        width={510}
        height={630}
        style={{ objectFit: "cover" }}
      />
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Manrope", data: font, weight: 400, style: "normal" },
        { name: "Allura", data: script, weight: 400, style: "normal" },
      ],
    },
  );
}
