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

    if (!apiKey) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = (await req.json()) as AuctionMcRequest;
    const mode = body.mode || "intro";

    if (mode === "reaction") {
      return createReaction(body, apiKey);
    }

    if (mode === "sold") {
      return createSoldMessage(body, apiKey);
    }

    return createIntro(body, apiKey);
  } catch (error) {
    console.error("auction-mc error:", error);
    return Response.json({ error: "AI generation failed" }, { status: 500 });
  }
}

async function createIntro(body: AuctionMcRequest, apiKey: string) {
  const openai = new OpenAI({ apiKey });

  const artistName =
    [body.childName, body.childSurname].filter(Boolean).join(" ").trim() ||
    "our young artist";

  const gradeText = body.grade ? " from " + body.grade : "";
  const artworkNumber = getArtworkNumber(body.sortOrder);

  const opening = getOpening(artworkNumber, artistName, gradeText);
  const closing =
    "Parents, get ready. The countdown is coming, and then bidding opens.";

  const prompt =
    "Write ONLY the middle section of a South African school art auction MC intro. " +
    "Do not write an opening line. Do not write a closing line. " +
    "Use 35 to 48 words. Make it warm, funny, proud, premium, and slightly cheeky. " +
    "Describe the artwork feeling, colours, imagination, family excitement, and young artist confidence. " +
    "Banned words and phrases: first, first up, first up tonight, first artwork, first piece, welcome, next on the easel, coming up now, countdown, bidding opens. " +
    "Do not repeat the artist name. Do not mention the grade. Do not start with we have, now taking the spotlight, next on the easel, coming up now, or our next young artist. Do not repeat phrases. " +
    "Artist: " +
    artistName +
    ". Grade: " +
    (body.grade || "not provided") +
    ". Artwork number: " +
    String(artworkNumber || "not provided") +
    ". Artwork story/details: " +
    (body.fallbackPreview ||
      "Use colour, imagination, young-artist confidence, and proud family auction energy.");

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You write only the middle section of a school art auction MC intro. Never write an opening sentence. Never use first, welcome, countdown, bidding, next on the easel, coming up now, now taking the spotlight, or we have.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.35,
  });

  const rawMiddle =
    completion.choices[0]?.message?.content || getFallbackMiddle();

  const middle = cleanMiddle(rawMiddle);
  const finalText = cleanFinal(opening + " " + middle + " " + closing);

  return Response.json({ text: finalText });
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
        " is keeping this masterpiece in the spotlight."
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

function getOpening(artworkNumber: number, artistName: string, gradeText: string) {
  if (artworkNumber === 1) {
    return "First up tonight, we have " + artistName + gradeText + ".";
  }

  const openings = [
    "Next on the easel, we have " + artistName + gradeText + ".",
    "Coming up now, we have " + artistName + gradeText + ".",
    "Our next young artist is " + artistName + gradeText + ".",
    "Now taking the spotlight, we have " + artistName + gradeText + ".",
    "Let us bring up the next masterpiece from " + artistName + gradeText + ".",
  ];

  if (!artworkNumber || artworkNumber < 2) {
    return openings[0];
  }

  return openings[(artworkNumber - 2) % openings.length];
}

function getFallbackMiddle() {
  return "This artwork is full of colour, imagination, and proud creative energy. It feels joyful, personal, frame-worthy, and ready for a proper BragWall moment.";
}

function cleanMiddle(value: string) {
  let text = String(value || "")
    .replace(/\bfirst\s+up(?:\s+tonight)?\b[,.!:\-]?\s*/gi, "")
    .replace(/\bfirst\s+artwork\b/gi, "artwork")
    .replace(/\bfirst\s+piece\b/gi, "piece")
    .replace(/\bfirst\s+painting\b/gi, "painting")
    .replace(/\bfirst\s+drawing\b/gi, "drawing")
    .replace(/\bfirst\s+creation\b/gi, "creation")
    .replace(/\bfirst\s+masterpiece\b/gi, "masterpiece")
    .replace(/\bfirst\b/gi, "")
    .replace(/\bwelcome\b/gi, "")
    .replace(/^\s*now\s+taking\s+the\s+spotlight,?\s+we\s+have\s+[^.?!]+[.?!]\s*/i, "")
    .replace(/^\s*next\s+on\s+the\s+easel,?\s+we\s+have\s+[^.?!]+[.?!]\s*/i, "")
    .replace(/^\s*coming\s+up\s+now,?\s+we\s+have\s+[^.?!]+[.?!]\s*/i, "")
    .replace(/^\s*our\s+next\s+young\s+artist\s+is\s+[^.?!]+[.?!]\s*/i, "")
    .replace(/^\s*let\s+us\s+bring\s+up\s+the\s+next\s+masterpiece\s+from\s+[^.?!]+[.?!]\s*/i, "")
    .replace(/\bnext\s+on\s+the\s+easel\b[,.!:\-]?\s*/gi, "")
    .replace(/\bcoming\s+up\s+now\b[,.!:\-]?\s*/gi, "")
    .replace(/\bour\s+next\s+young\s+artist\s+is\b[,.!:\-]?\s*/gi, "")
    .replace(/\bnow\s+taking\s+the\s+spotlight\b[,.!:\-]?\s*/gi, "")
    .replace(/\blet\s+us\s+bring\s+up\s+the\s+next\s+masterpiece\s+from\b[,.!:\-]?\s*/gi, "")
    .replace(/\bparents,?\s+get\s+ready\b[,.!:\-]?\s*/gi, "")
    .replace(/\bthe\s+countdown\s+is\s+coming\b[,.!:\-]?\s*/gi, "")
    .replace(/\bbidding\s+opens\b[,.!:\-]?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  text = text.replace(/^[,.:;\-\s]+/, "").trim();

  if (!text) {
    text = getFallbackMiddle();
  }

  return removeDuplicateWords(text);
}

function cleanFinal(value: string) {
  let text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  text = removeDuplicateWords(text);
  text = removeDuplicatePhrases(text);

  return text.replace(/\s+/g, " ").trim();
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

function removeDuplicatePhrases(value: string) {
  let text = String(value || "");

  const phrases = [
    "First up tonight",
    "Next on the easel",
    "Coming up now",
    "Our next young artist",
    "Now taking the spotlight",
    "Parents, get ready",
  ];

  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let seen = false;

    text = text.replace(
      new RegExp("\\b" + escaped + "\\b[,.!:\\-]?\\s*", "gi"),
      (match) => {
        if (!seen) {
          seen = true;
          return match;
        }

        return "";
      }
    );
  }

  return text.replace(/\s+/g, " ").trim();
}
