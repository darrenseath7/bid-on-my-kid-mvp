import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  const body = await request.json();
  const { childName, grade, artworkNotes } = body;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      intro: `Ladies and gentlemen, presenting a once-in-a-lifetime masterpiece by ${childName || 'our young artist'} from ${grade || 'this grade'} — bold, emotional, and already causing healthy competition among serious fridge-wall collectors.`
    });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a funny, warm South African school auction MC. Write premium but humorous art auction introductions for parents bidding on children artwork. Keep it under 140 words. Do not be mean. Make every output unique.' },
      { role: 'user', content: `Child: ${childName}. Grade: ${grade}. Artwork notes: ${artworkNotes || 'No notes provided.'}` }
    ]
  });

  return NextResponse.json({ intro: completion.choices[0]?.message?.content || '' });
}
