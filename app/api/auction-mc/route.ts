import OpenAI from "openai";

type AuctionMcRequest = {
  childName?: string;
  childSurname?: string;
  grade?: string;
  highestBid?: number;
  bidderName?: string;
  mode?: "intro" | "reaction" | "sold";
  fallbackPreview?: string;
  sortOrder?: number | string;
  artworkUrl?: string;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const body = (await req.json()) as AuctionMcRequest;
    const mode = body.mode || "intro";

    if (mode === "intro") {
      if (!apiKey) {
        return Response.json({ text: createSafeIntro(body, getFallbackMiddle()) });
      }

      return createIntro(body, apiKey);
    }

    if (!apiKey) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    if (mode === "reaction") {
      return createReaction(body, apiKey);
    }

    if (mode === "sold") {
      return createSoldMessage(body, apiKey);
    }

    return Response.json({ text: createSafeIntro(body, getFallbackMiddle()) });
  } catch (error) {
    console.error("auction-mc error:", error);
    return Response.json({ error: "AI generation failed" }, { status: 500 });
  }
}

async function createIntro(body: AuctionMcRequest, apiKey: string) {
  const openai = new OpenAI({ apiKey });
  const safeArtworkDetails = cleanArtworkDetails(body.fallbackPreview || "");

  const prompt =
    "Write only the middle description for a South African school artwork auction MC script. " +
    "Do not introduce the child. Do not mention any child name. Do not mention any grade. " +
    "Do not use these words or phrases: first, welcome, we have, spotlight, easel, coming up, next in the auction, countdown, bidding opens. " +
    "Start directly with what is visible or felt in the artwork. " +
    "Make it warm, proud, premium, funny, and cheeky in a kind South African school-fundraiser way. " +
    "The humour should feel like a playful auctioneer teasing the parents, not teasing the child or the artwork. " +
    "Use one light joke or cheeky line, for example about fridge-door fame, lounge-wall bragging rights, grandparents getting competitive, or parents pretending they are calm. " +
    "Be specific to the visible artwork: mention colours, shapes, characters, objects, mood, imagination, and why it deserves a special place at home. " +
    "Use 55 to 85 words. Keep it energetic and spoken aloud. Do not repeat any phrase. " +
    "Artwork notes: " +
    (safeArtworkDetails ||
      "Use colour, imagination, young creative confidence, family pride, playful parent competition, and school auction excitement.");

  const userContent = body.artworkUrl
    ? ([
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: String(body.artworkUrl),
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
          "You write only the middle artwork description for a South African school auction MC. Be warm, proud, visual, funny, and cheeky without being rude. Never introduce the child. Never mention names or grades. Never use first, welcome, we have, spotlight, easel, countdown, or bidding.",
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    temperature: 0.72,
  });

  const rawMiddle = completion.choices[0]?.message?.content || getFallbackMiddle();
  const middle = cleanMiddle(rawMiddle);

  return Response.json({ text: createSafeIntro(body, middle) });
}

function createSafeIntro(body: AuctionMcRequest, middle: string) {
  const artistName =
    [body.childName, body.childSurname].filter(Boolean).join(" ").trim() ||
    "our young artist";

  const gradeText = body.grade ? " from " + body.grade : "";
  const artworkNumber = getArtworkNumber(body.sortOrder);

  const opening = getOpening(artworkNumber, artistName, gradeText);
  const safeMiddle = cleanMiddle(middle);
  const closing =
    "Parents, get ready. The countdown is coming, and then bidding opens.";

  return cleanFinal(opening + " " + safeMiddle + " " + closing);
}

function getOpening(artworkNumber: number, artistName: string, gradeText: string) {
  if (artworkNumber === 1) {
    return "First up tonight, we have " + artistName + gradeText + ".";
  }

  return "Next in the auction, we have " + artistName + gradeText + ".";
}

async function createReaction(body: AuctionMcRequest, apiKey: string) {
  const openai = new OpenAI({ apiKey });

  const highestBid = Number(body.highestBid || 0);
  const bidderName = body.bidderName || "our leading bidder";

  const prompt =
    "You are a funny South African school auction MC reacting to a live bid. " +
    "Current highest bid: R" +
    highestBid +
    ". Leading bidder: " +
    bidderName +
    ". Create one short funny reaction line. Do not repeat yourself.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You are a funny South African school auction MC.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.85,
  });

  const text = cleanFinal(
    completion.choices[0]?.message?.content ||
      "R" +
        highestBid +
        ". " +
        bidderName +
        " is keeping this masterpiece in play."
  );

  return Response.json({ text });
}

async function createSoldMessage(body: AuctionMcRequest, apiKey: string) {
  const openai = new OpenAI({ apiKey });

  const highestBid = Number(body.highestBid || 0);
  const bidderName = body.bidderName || "our winning bidder";

  const prompt =
    "You are a charismatic South African auction MC. " +
    "The artwork has just sold. Winning bidder: " +
    bidderName +
    ". Winning amount: R" +
    highestBid +
    ". Create a short funny celebratory sold message. Do not repeat yourself.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You are a funny South African school auction MC.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.85,
  });

  const text = cleanFinal(
    completion.choices[0]?.message?.content ||
      "Sold for R" +
        highestBid +
        ". " +
        bidderName +
        ", that is a proud BragWall moment."
  );

  return Response.json({ text });
}

function getArtworkNumber(sortOrder: unknown) {
  const value = Number(sortOrder);

  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value);
}

function cleanArtworkDetails(value: string) {
  return String(value || "")
    .replace(/\bfirst\b/gi, "")
    .replace(/\bwelcome\b/gi, "")
    .replace(/\bspotlight\b/gi, "")
    .replace(/\beasel\b/gi, "")
    .replace(/\bwe have\b/gi, "")
    .replace(/\bcoming up\b/gi, "")
    .replace(/\bnext in the auction\b/gi, "")
    .replace(/\bgrade\s*\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFallbackMiddle() {
  return "This artwork is bursting with colour, imagination, and proper young-artist confidence. It has the kind of charm that makes parents pretend they are just browsing, while secretly measuring the lounge wall. Definitely fridge-door famous, possibly frame-worthy, and ready for a proper BragWall moment.";
}

function cleanMiddle(value: string) {
  const original = String(value || "").replace(/\s+/g, " ").trim();
  const sentences = original.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [original];

  const kept = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    const banned =
      lower.includes("first") ||
      lower.includes("welcome") ||
      lower.includes("we have") ||
      lower.includes("spotlight") ||
      lower.includes("easel") ||
      lower.includes("coming up") ||
      lower.includes("next in the auction") ||
      lower.includes("countdown") ||
      lower.includes("bidding opens") ||
      lower.includes("parents, get ready") ||
      lower.includes("now taking") ||
      lower.includes("bring up") ||
      lower.includes(" from grade") ||
      lower.includes("grade ");

    return !banned;
  });

  let text = kept.join(" ").replace(/\s+/g, " ").trim();

  text = text
    .replace(/\bfirst\b/gi, "")
    .replace(/\bwelcome\b/gi, "")
    .replace(/\bwe\s+have\b/gi, "")
    .replace(/\bspotlight\b/gi, "")
    .replace(/\beasel\b/gi, "")
    .replace(/\bcoming\s+up\b/gi, "")
    .replace(/\bnext\s+in\s+the\s+auction\b/gi, "")
    .replace(/\byoung\s+artist\b/gi, "young creator")
    .replace(/\bcountdown\b/gi, "")
    .replace(/\bbidding\s+opens\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.split(" ").length < 16) {
    text = getFallbackMiddle();
  }

  return removeDuplicateWords(text);
}

function cleanFinal(value: string) {
  let text = String(value || "")
    .replace(/\bnow taking the spotlight\b/gi, "")
    .replace(/\bspotlight\b/gi, "")
    .replace(/\beasel\b/gi, "")
    .replace(/\bwe have we have\b/gi, "we have")
    .replace(/\s+/g, " ")
    .trim();

  text = removeDuplicateWords(text);

  return text;
}

function removeDuplicateWords(value: string) {
  const words = String(value || "").split(" ");
  const result: string[] = [];

  for (const word of words) {
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    const previousWord =
      result.length > 0
        ? result[result.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "")
        : "";

    if (cleanWord && cleanWord === previousWord) {
      continue;
    }

    result.push(word);
  }

  return result.join(" ").replace(/\s+/g, " ").trim();
}
