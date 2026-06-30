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
      return Response.json({
        text: createSafeIntro(body),
      });
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

    return Response.json({
      text: createSafeIntro(body),
    });
  } catch (error) {
    console.error("auction-mc error:", error);
    return Response.json({ error: "AI generation failed" }, { status: 500 });
  }
}

function createSafeIntro(body: AuctionMcRequest) {
  const artistName =
    [body.childName, body.childSurname].filter(Boolean).join(" ").trim() ||
    "our young artist";

  const gradeText = body.grade ? " from " + body.grade : "";
  const artworkNumber = getArtworkNumber(body.sortOrder);

  const opening = getOpening(artworkNumber, artistName, gradeText);
  const middle = getArtworkMiddle(body.fallbackPreview);
  const closing =
    "Parents, get ready. The countdown is coming, and then bidding opens.";

  return cleanFinal(opening + " " + middle + " " + closing);
}

function getOpening(artworkNumber: number, artistName: string, gradeText: string) {
  if (artworkNumber === 1) {
    return "First up tonight, we have " + artistName + gradeText + ".";
  }

  if (artworkNumber === 2) {
    return "Next in the auction, we have " + artistName + gradeText + ".";
  }

  if (artworkNumber === 3) {
    return "Our next masterpiece comes from " + artistName + gradeText + ".";
  }

  if (artworkNumber === 4) {
    return "Now in the auction, we have " + artistName + gradeText + ".";
  }

  return "Next in line, we have " + artistName + gradeText + ".";
}

function getArtworkMiddle(fallbackPreview?: string) {
  const preview = cleanPreview(fallbackPreview || "");

  if (preview.length > 20) {
    return (
      "This artwork brings colour, imagination, and proud creative energy to the room. " +
      "There is real personality in this piece, and it feels ready for a special place at home."
    );
  }

  return (
    "This artwork brings colour, imagination, and proud creative energy to the room. " +
    "It is full of charm, school pride, and the kind of creativity that deserves a proper BragWall moment."
  );
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

function cleanPreview(value: string) {
  return String(value || "")
    .replace(/\bfirst\b/gi, "")
    .replace(/\bwelcome\b/gi, "")
    .replace(/\bspotlight\b/gi, "")
    .replace(/\beasel\b/gi, "")
    .replace(/\bwe have\b/gi, "")
    .replace(/\bcoming up\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
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
