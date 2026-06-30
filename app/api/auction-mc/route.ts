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
- Keep it between 55 and 70 words.
- Mention the artist once by name.
- Mention the grade once if provided.
- Use humour, but keep it kind and family-friendly.
- Relate the intro to the artwork story below.
- Do not repeat phrases, names, or words awkwardly.
- Do not use the word welcome.
- Do not use the phrases "first up", "first up tonight", "first artwork", or "first piece".
- Do not create an opening line. Start directly with the artwork, artist, colours, story, or energy.
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
          content:
            mode === "intro"
              ? "You are an elite South African live auction MC. Never use the phrases first up, first up tonight, first artwork, first piece, or welcome."
              : "You are an elite South African live auction MC.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: mode === "intro" ? 0.55 : 0.9,
    });

    const rawText =
      completion.choices[0].message.content || getFallbackIntroBody();

    const generatedText =
      mode === "intro"
        ? buildControlledIntro(rawText, sortOrder)
        : cleanGeneralMcText(rawText);

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

function getFallbackIntroBody() {
  return "this artwork is ready for its moment in the spotlight, full of colour, imagination, and proud young-artist confidence. Families, keep your bidding fingers ready because after the countdown, this masterpiece deserves a proper BragWall battle.";
}

function buildControlledIntro(value: string, sortOrder?: unknown) {
  const order = Number(sortOrder || 0);
  const isLaterArtwork = Number.isFinite(order) && order > 1;

  const opening = isLaterArtwork
    ? "Next on the easel,"
    : "First up tonight,";

  const body = cleanIntroBody(value);

  return removeRepeatedShortPhrases(`${opening} ${body}`)
    .replace(/\s+/g, " ")
    .trim();
}

function cleanIntroBody(value: string) {
  let text = String(value || "")
    .replace(/^\s*["'`]+|["'`]+\s*$/g, "")
    .replace(/^\s*welcome(?:\s+welcome)*(?:\s+to\s+bragwall)?[.!,:;\-]*\s*/i, "")
    .replace(/\bwelcome\s+welcome\b/gi, "")
    .replace(/\bfirst\s+up(?:\s+tonight)?\b[,.!:\-]?\s*/gi, "")
    .replace(/\bfirst\s+artwork\b/gi, "artwork")
    .replace(/\bfirst\s+piece\b/gi, "piece")
    .replace(/\bour\s+first\s+young\s+artist\b/gi, "our young artist")
    .replace(/\bthe\s+first\s+young\s+artist\b/gi, "the young artist")
    .replace(/\bfirst\s+young\s+artist\b/gi, "young artist")
    .replace(/\bfirst\s+masterpiece\b/gi, "masterpiece")
    .replace(/\bfirst\s+painting\b/gi, "painting")
    .replace(/\bfirst\s+drawing\b/gi, "drawing")
    .replace(/\bfirst\s+creation\b/gi, "creation")
    .replace(/\bfirst\s+item\b/gi, "item")
    .replace(/\bfirst\s+entry\b/gi, "entry")
    .replace(/\s+/g, " ")
    .trim();

  text = text.replace(/^[,.:;\-\s]+/, "").trim();

  if (!text) {
    text = getFallbackIntroBody();
  }

  return removeConsecutiveDuplicateWords(text);
}

function cleanGeneralMcText(value: string) {
  return removeConsecutiveDuplicateWords(
    String(value || "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function removeConsecutiveDuplicateWords(value: string) {
  return String(value || "")
    .split(/(\s+)/)
    .filter((part, index, parts) => {
      if (/\s+/.test(part)) return true;

      const previousWord = [...parts]
        .slice(0, index)
        .reverse()
        .find((item) => !/\s+/.test(item));

      if (!previousWord) return true;

      return (
        previousWord.toLowerCase().replace(/[^a-z0-9]/g, "") !==
        part.toLowerCase().replace(/[^a-z0-9]/g, "")
      );
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function removeRepeatedShortPhrases(value: string) {
  let text = String(value || "");

  const repeatedPhrases = [
    "First up tonight",
    "Next on the easel",
    "Coming up now",
    "Our next young artist",
    "Eyes on this masterpiece",
  ];

  for (const phrase of repeatedPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let seen = false;

    text = text.replace(new RegExp(`\\b${escaped}\\b[,.!:\\-]?\\s*`, "gi"), (match) => {
      if (!seen) {
        seen = true;
        return match;
      }

      return "";
    });
  }

  return text.replace(/\s+/g, " ").trim();
}
