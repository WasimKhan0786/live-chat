
export const DEFAULT_ICE_SERVERS = [
  // Public Google STUN servers (Reliable)
  { urls: 'stun:stun.l.google.com:19302' }, 
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  
  // Public Twilio STUN server
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export const fetchIceServers = async () => {
  try {
      // Calling our internal secure API route (hides the API Key)
      const response = await fetch("/api/turn-credentials");
      
      // Saving the response in the iceServers array
      const turnServers = await response.json();
      
      // Combine default STUN servers with the fetched TURN servers
      return [...DEFAULT_ICE_SERVERS, ...turnServers];
  } catch (error) {
      console.error("Failed to fetch TURN credentials from Metered:", error);
      // Fallback to default STUN servers if API fails
      return DEFAULT_ICE_SERVERS;
  }
};
