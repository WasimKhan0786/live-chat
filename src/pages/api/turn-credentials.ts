import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const apiKey = process.env.METERED_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'METERED_API_KEY is not defined in server environment' });
    }

    // Call Metered API from the SERVER side (hidden from user)
    const response = await fetch(`https://wasim-live-chat.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
    
    if (!response.ok) {
        throw new Error(`Metered API error: ${response.statusText}`);
    }

    const turnServers = await response.json();
    res.status(200).json(turnServers);

  } catch (error) {
    console.error("TURN API Error:", error);
    res.status(500).json({ error: 'Failed to fetch TURN credentials' });
  }
}
