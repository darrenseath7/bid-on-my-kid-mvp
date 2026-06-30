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

  const safeArtworkDetails = stripChildAndGradeWords(
    body.fallbackPreview || "",
    artistName,
    body.grade
  );

  const prompt =
    "Write ONLY a middle description for a school artwork auction MC script. " +
    "Do not introduce anyone. Do not mention any child name. Do not mention any grade. " +
    "Do not use the words first, welcome, spotlight, easel, coming up, we have, artist name, countdown, or bidding. " +
    "Write 32 to 44 words only. " +
    "Start directly with the artwork itself. " +
    "Make it warm, funny, proud, premium, and slightly cheeky. " +
    "Talk about colours, imagination, family pride, young creativity, and why the artwork deserves a special place at home. " +
    "Do not repeat any phrase. " +
    "Artwork details: " +
    (safeArtworkDetails ||
      "Use colour, imagination, young creative confidence, family pride, and school auction excitement.");

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
          "You write only an artwork description. Never introduce the child. Never mention names or grades. Never use spotlight, easel, first, welcome, countdown, bidding, or we have.",
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    temperature: 0.25,
  });

  const rawMiddle =
    completion.choices[0]?.message?.content || getFallbackMiddle();

  const middle = cleanMiddle(rawMiddle, artistName, body.grade);
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

function stripChildAndGradeWords(value: string, artistName: string, grade?: string) {
  let text = String(value || "");

  const names = artistName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const name of names) {
    text = text.replace(new RegExp(escapeRegExp(name), "gi"), "");
  }

  if (artistName) {
    text = text.replace(new RegExp(escapeRegExp(artistName), "gi"), "");
  }

  if (grade) {
    text = text.replace(new RegExp(escapeRegExp(grade), "gi"), "");
  }

  text = text
    .replace(/\bgrade\s*\d+\b/gi, "")
    .replace(/\bgrade\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function getFallbackMiddle() {
  return "This artwork is bursting with colour, imagination, and proud creative energy. It feels joyful, frame-worthy, and full of the kind of charm that turns a school auction into a proper BragWall moment.";
}

function cleanMiddle(value: string, artistName?: string, grade?: string) {
  const original = String(value || "").replace(/\s+/g, " ").trim();
  const sentences = original.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [original];

  const cleanArtistName = String(artistName || "").toLowerCase().trim();
  const cleanGrade = String(grade || "").toLowerCase().trim();

  const kept = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();

    const mentionsArtist =
      cleanArtistName.length > 0 && lower.includes(cleanArtistName);

    const mentionsAnyNamePart =
      cleanArtistName
        .split(" ")
        .filter(Boolean)
        .some((part) => lower.includes(part));

    const mentionsGrade =
      lower.includes("grade ") ||
      lower.includes(" grade") ||
      (cleanGrade.length > 0 && lower.includes(cleanGrade));

    const banned =
      lower.includes("first") ||
      lower.includes("welcome") ||
      lower.includes("we have") ||
      lower.includes("spotlight") ||
      lower.includes("easel") ||
      lower.includes("coming up") ||
      lower.includes("young artist") ||
      lower.includes("countdown") ||
      lower.includes("bidding opens") ||
      lower.includes("parents, get ready") ||
      lower.includes("now taking") ||
      lower.includes("bring up");

    return !mentionsArtist && !mentionsAnyNamePart && !mentionsGrade && !banned;
  });

  let text = kept.join(" ").replace(/\s+/g, " ").trim();

  text = text
    .replace(/\bfirst\b/gi, "")
    .replace(/\bwelcome\b/gi, "")
    .replace(/\bwe\s+have\b/gi, "")
    .replace(/\bspotlight\b/gi, "")
    .replace(/\beasel\b/gi, "")
    .replace(/\bcoming\s+up\b/gi, "")
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
    .replace(/\s+/g, " ")
    .trim();

  text = removeDuplicateWords(text);
  text = removeDuplicateControlledOpenings(text);

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

function removeDuplicateControlledOpenings(value: string) {
  const sentences = String(value || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g);

  if (!sentences || sentences.length < 2) {
    return value;
  }

  const first = sentences[0].toLowerCase();
  const second = sentences[1].toLowerCase();

  const firstIsOpening =
    first.includes("first up tonight") ||
    first.includes("next on the easel") ||
    first.includes("coming up now") ||
    first.includes("our next young artist") ||
    first.includes("now taking the spotlight") ||
    first.includes("let us bring up");

  const secondIsOpening =
    second.includes("we have") ||
    second.includes("spotlight") ||
    second.includes("easel") ||
    second.includes("coming up") ||
    second.includes("from grade") ||
    second.includes("grade ");

  if (firstIsOpening && secondIsOpening) {
    return [sentences[0], ...sentences.slice(2)].join(" ").trim();
  }

  return value;
}

function escapeRegExp(value: string) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
