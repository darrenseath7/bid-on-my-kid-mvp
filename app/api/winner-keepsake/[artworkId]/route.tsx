import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { validWinnerToken, winnerDb } from "@/lib/server/winnerWhatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ artworkId: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hexToken = /^[0-9a-f]{64}$/;
const noStore = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function unavailable(status: number) {
  return new Response(status === 404 ? "Keepsake not found" : "Keepsake unavailable", {
    status,
    headers: noStore,
  });
}

export async function GET(request: NextRequest, { params }: Context) {
  const { artworkId } = await params;
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!uuid.test(artworkId) || !hexToken.test(token)) return unavailable(404);

  try {
    const db = winnerDb();
    const { data: winner, error: winnerError } = await db
      .from("auction_winner_whatsapp")
      .select("auction_code,bidder_contact_id,created_at")
      .eq("artwork_id", artworkId).maybeSingle();
    if (winnerError || !winner || !validWinnerToken(artworkId, winner.bidder_contact_id, token)) {
      return unavailable(404);
    }

    const { data: artwork, error: artworkError } = await db
      .from("demo_artworks")
      .select("status,child_name,child_surname,grade,artwork_url,enhanced_artwork_url,winning_bidder")
      .eq("id", artworkId).eq("auction_code", winner.auction_code).maybeSingle();
    if (artworkError || !artwork || artwork.status !== "sold") return unavailable(404);

    const imageUrl = new URL(artwork.enhanced_artwork_url || artwork.artwork_url || "");
    const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    if (imageUrl.origin !== projectUrl.origin ||
        !imageUrl.pathname.startsWith("/storage/v1/object/public/artworks/")) {
      return unavailable(503);
    }

    const imageResult = await fetch(imageUrl, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    const mediaType = (imageResult.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const sizeHint = Number(imageResult.headers.get("content-length") || 0);
    const maxImageBytes = 20 * 1024 * 1024;
    if (!imageResult.ok || !["image/jpeg", "image/png", "image/webp"].includes(mediaType) ||
        sizeHint > maxImageBytes) return unavailable(503);
    const imageBytes = await imageResult.arrayBuffer();
    if (imageBytes.byteLength > maxImageBytes) return unavailable(503);

    const art = [artwork.child_name, artwork.child_surname].filter(Boolean).join(" ").trim() || "A young artist";
    const rawName = String(artwork.winning_bidder || "").trim().split(/\s+/)[0];
    const winnerName = rawName ? rawName.charAt(0).toLocaleUpperCase() + rawName.slice(1) : "You";
    const date = new Intl.DateTimeFormat("en-ZA", {
      day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg",
    }).format(new Date(winner.created_at));
    const imageData = `data:${mediaType};base64,${Buffer.from(imageBytes).toString("base64")}`;

    return new ImageResponse(
      <div style={{
        display: "flex", flexDirection: "column", width: "100%", height: "100%",
        padding: "66px", backgroundColor: "#07152b", color: "#fff",
        fontFamily: "sans-serif", position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 61, fontWeight: 900, letterSpacing: -2 }}>BragWall</div>
            <div style={{ color: "#ffc857", fontSize: 20, fontWeight: 800, letterSpacing: 5 }}>
              YOUNG ART. BIG PRIDE.
            </div>
          </div>
          <div style={{ display: "flex", borderRadius: 100, padding: "16px 28px",
            backgroundColor: "#13ed77", color: "#07152b", fontSize: 28, fontWeight: 900 }}>
            SOLD!
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 82 }}>
          <div style={{ color: "#13ed77", fontSize: 24, fontWeight: 800, letterSpacing: 5 }}>
            THE MOMENT YOU WON
          </div>
          <div style={{ fontSize: 74, fontWeight: 900, lineHeight: 1.08, marginTop: 20 }}>
            {winnerName}, you did it!
          </div>
          <div style={{ color: "#ffc857", fontSize: 31, marginTop: 22 }}>
            A young artist made this. You made this moment.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 66, height: 880, padding: 24, borderRadius: 34,
          border: "5px solid #ffc857", backgroundColor: "#101c30" }}>
          {/* A full-size raster image keeps the child's original artwork intact. */}
          <img src={imageData} alt="Winning artwork"
            style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 65 }}>
          <div style={{ color: "#13ed77", fontSize: 23, fontWeight: 900, letterSpacing: 5 }}>
            THE ARTIST BEHIND THE ART
          </div>
          <div style={{ fontSize: 64, fontWeight: 900, marginTop: 12 }}>{art}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 24, color: "#ffc857", fontSize: 29, fontWeight: 700 }}>
            <span>{artwork.grade || "Young artist"}</span>
            <span>{date}</span>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "auto", paddingTop: 30,
          borderTop: "2px solid #344159", fontSize: 25, color: "#c6d1e2" }}>
          A BragWall moment to keep. Thank you for believing in young art.
        </div>
      </div>,
      {
        width: 1080,
        height: 1920,
        headers: {
          ...noStore,
          "Content-Disposition": 'attachment; filename="BragWall-SOLD-moment.png"',
        },
      }
    );
  } catch {
    return unavailable(503);
  }
}
