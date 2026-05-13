import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Fetch the website HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AEO Analyzer Bot)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch website' }, { status: 400 });
    }

    const html = await response.text();

    // Parse HTML with Cheerio
    const $ = cheerio.load(html);
    const title = $('title').text();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    // Prepare content for AI (limit to avoid token issues)
    const content = `Title: ${title}\n\nBody Text: ${bodyText.substring(0, 10000)}`;

    // AI Prompt
    const prompt = `You are an expert in AEO (Answer Engine Optimization) for improving website visibility in chat bots and answer engines.

Analyze the following website content and provide:
1. An overall AEO score out of 100
2. A list of the top 5 improvement suggestions, prioritized by importance

Each suggestion should have a short title and detailed explanation.

Return ONLY valid JSON in this format:
{
  "score": number,
  "suggestions": [
    {
      "title": "string",
      "details": "string"
    }
  ]
}

Website Content:
${content}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use a cost-effective model
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
    }

    // Parse AI response as JSON
    const result = JSON.parse(aiResponse);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}