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
- Do not say “welcome” more than once.
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

    return Response.json({
      text:
        completion.choices[0].message.content ||
        "Bidding is heating up beautifully tonight.",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}