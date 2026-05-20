import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      childName,
      grade,
      highestBid,
      bidderName,
      mode,
    } = body;

    let prompt = "";

    if (mode === "intro") {
      prompt = `
You are a funny, charismatic South African school auction MC.

Create a short premium-art-auction-style introduction for a child's artwork.

The tone must be:
- witty,
- warm,
- emotionally engaging,
- slightly cheeky,
- premium,
- playful.

Do not sound robotic.

Artwork artist:
${childName}
${grade}

Keep response under 120 words.
`;
    }

    if (mode === "reaction") {
      prompt = `
You are a live South African school auction MC reacting to live bids.

Current highest bid:
R${highestBid}

Leading bidder:
${bidderName}

Create ONE funny live reaction line.

Examples:
- “Grandparents entering the chat. Dangerous scenes.”
- “Someone clearly wants favourite-parent status tonight.”
- “At this point this artwork may need armed security.”

Keep it witty and short.
`;
    }

    if (mode === "sold") {
      prompt = `
You are a charismatic South African auction MC.

The artwork has just SOLD.

Winning bidder:
${bidderName}

Winning amount:
R${highestBid}

Create a funny celebratory sold message.
`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an elite South African live auction MC.",
        },
        {
          role: "user",
          content: prompt,
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
      {
        error: "AI generation failed",
      },
      {
        status: 500,
      }
    );
  }
}