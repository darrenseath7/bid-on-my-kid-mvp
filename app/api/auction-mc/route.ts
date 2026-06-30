import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const body = await req.json();

    const {
      childName,
      childSurname,
      grade,
      highestBid,
      bidderName,
      mode,
      fallbackPreview,
      sortOrder,
      artworkUrl,
    } = body;

    let prompt = "";

    if (mode === "intro") {
      prompt = `
You are a funny, charismatic South African school auction MC.

Create a premium-art-auction-style introduction for a child's artwork.
It must sound like a live MC script that takes about 30 seconds to say out loud.

Tone:
- witty
- warm
- emotionally engaging
- slightly cheeky
- premium
- playful

Rules:
- Keep it between 65 and 80 words.
- Mention the artist once by name.
- Mention the grade once if provided.
- Use humour, but keep it kind and family-friendly.
- Relate the intro to the artwork story below.
- Do not repeat phrases, names, or words awkwardly.
- Do not use the word “welcome”. The separate Welcome MC already welcomes the room.
- Do not start with “Welcome”, “Welcome welcome”, or “Welcome to”.
- If Artwork order is 1 or not provided, you may start with “First up tonight”, but only once.
- Never use “First up” more than once in the entire script.
- If Artwork order is 2 or higher, NEVER say “first up”, “first artwork”, or “first piece” anywhere. Start with “Next on the easel”, “Coming up now”, “Eyes on this masterpiece”, or “Our next young artist”.
- End by building anticipation for bidding after the countdown.

Artist:
${[childName, childSurname].filter(Boolean).join(" ") || "our young artist"}
Grade:
${grade || "not provided"}
Artwork order:
${sortOrder || "not provided"}
Artwork story/details:
${fallbackPreview || "Use colour, imagination, young-artist confidence, and proud family bidding energy."}

Artwork image:
${artworkUrl || "not provided"}

If an artwork image is provided, use what is visible in the painting to make the intro feel specific. Do not invent private details about the child.
`;
    }

    if (mode === "reaction") {
      prompt = `
You are a live South African school auction MC reacting to live bids.

Current highest bid: R${highestBid}
Leading bidder: ${bidderName}

Create one funny live reaction line. Keep it short.
`;
    }

    if (mode === "sold") {
      prompt = `
You are a charismatic South African auction MC.

The artwork has just SOLD.

Winning bidder: ${bidderName}
Winning amount: R${highestBid}

Create a funny celebratory sold message.
`;
    }

    const userContent =
      mode === "intro" && artworkUrl
        ? ([
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: String(artworkUrl),
                detail: "low",
              },
            },
          ] as any)
        : prompt;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are an elite South African live auction MC.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: 0.9,
    });

    const generatedText = cleanMcIntroText(
      completion.choices[0].message.content ||
        getFallbackIntroOpening(sortOrder),
      sortOrder
    );

    return Response.json({
      text: generatedText,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}

function getFallbackIntroOpening(sortOrder: unknown) {
  const order = Number(sortOrder || 0);

  if (Number.isFinite(order) && order > 1) {
    return "Next on the easel, this artwork is ready for its moment in the spotlight. Bidding is about to heat up beautifully.";
  }

  return "First up tonight, this artwork is ready for its moment in the spotlight. Bidding is about to heat up beautifully.";
}

function cleanMcIntroText(value: string, sortOrder?: unknown) {
  const cleaned = String(value || "")
    .replace(/^\s*welcome(?:\s+welcome)*(?:\s+to\s+bragwall)?[.!,:;\-]*\s*/i, "")
    .replace(/\bwelcome\s+welcome\b/gi, "welcome")
    .replace(/\s+/g, " ")
    .trim();

  return removeConsecutiveDuplicateWords(
    normalizeAuctionOpeningPhrases(cleaned, sortOrder)
  );
}

function normalizeAuctionOpeningPhrases(value: string, sortOrder?: unknown) {
  const order = Number(sortOrder || 0);
  const isLaterArtwork = Number.isFinite(order) && order > 1;
  let firstUpSeen = false;

  return String(value || "")
    .replace(/\bfirst\s+up(?:\s+tonight)?\b/gi, (match) => {
      if (!isLaterArtwork && !firstUpSeen) {
        firstUpSeen = true;
        return match;
      }

      return "Next on the easel";
    })
    .replace(/\bfirst\s+artwork\b/gi, isLaterArtwork ? "next artwork" : "artwork")
    .replace(/\bfirst\s+piece\b/gi, isLaterArtwork ? "next piece" : "piece")
    .replace(/\b(next on the easel)([,.!:\-]?\s+)(?:next on the easel\b[,.!:\-]?\s*)+/gi, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function removeConsecutiveDuplicateWords(value: string) {
  return value
    .split(/(\s+)/)
    .filter((part, index, parts) => {
      if (/\s+/.test(part)) return true;

      const previousWord = [...parts]
        .slice(0, index)
        .reverse()
        .find((item) => !/\s+/.test(item));

      if (!previousWord) return true;

      return previousWord.toLowerCase().replace(/[^a-z0-9]/g, "") !==
        part.toLowerCase().replace(/[^a-z0-9]/g, "");
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
