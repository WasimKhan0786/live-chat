import { NextResponse } from 'next/server';
import yts from 'yt-search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const r = await yts(query);
    const videos = r.videos.slice(0, 10).map(v => ({
        id: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        timestamp: v.timestamp,
        author: v.author.name,
        url: v.url
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Search Error:", error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
