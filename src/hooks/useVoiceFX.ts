import { useRef, useState, useEffect } from 'react';
import SimplePeer from 'simple-peer';

export interface PeerData {
    peerId: string;
    peer: SimplePeer.Instance;
    name: string;
}

export const useVoiceFX = (
    myStream: MediaStream | null,
    peersRef: React.MutableRefObject<PeerData[]>
) => {
    const [voiceEffect, setVoiceEffect] = useState("none");
    const [hearMyself, setHearMyself] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const originalAudioStreamRef = useRef<MediaStream | null>(null);
    const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const processingNodeRef = useRef<AudioNode | null>(null);
    const audioGraphRef = useRef<{ source: MediaStreamAudioSourceNode | null, nodes: AudioNode[] }>({ source: null, nodes: [] });

    // Ensure AudioContext connects/disconnects based on visibility to save resources/prevent bugs
    useEffect(() => {
        const handleVisibilityChange = () => {
              if (document.visibilityState === 'visible') {
                  if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                      audioContextRef.current.resume();
                  }
              }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    const applyVoice = (effect: string) => {
        setVoiceEffect(effect);
        
        if(!myStream) return;
        
        // Initialize original stream ref if needed
        if(!originalAudioStreamRef.current) {
            const track = myStream.getAudioTracks()[0];
            if(track) originalAudioStreamRef.current = new MediaStream([track]);
        }
        
        // If NONE, revert to original track and bypass AudioContext
        if (effect === 'none') {
             const originalTrack = originalAudioStreamRef.current?.getAudioTracks()[0];
             if (originalTrack) {
                  // Cleanup graph
                  if (audioGraphRef.current.source) {
                      try { audioGraphRef.current.source.disconnect(); } catch(e) {}
                  }
                  audioGraphRef.current.nodes.forEach(n => {
                      try { n.disconnect(); } catch(e) {}
                  });
                  audioGraphRef.current = { source: null, nodes: [] };
  
                  // Replace sender with original track
                  peersRef.current.forEach(p => {
                          if(p.peer && !p.peer.destroyed) {
                              const pc = (p.peer as any)._pc; 
                              if (pc) {
                                  const senders = pc.getSenders();
                                  const audioSender = senders.find((s: RTCRtpSender) => s.track && s.track.kind === 'audio');
                                  if(audioSender) {
                                      audioSender.replaceTrack(originalTrack).catch((e: any) => console.log("Replace Track Error", e));
                                  }
                              }
                          }
                  });
             }
             return;
        }
  
        if(!originalAudioStreamRef.current) return;
  
        if(!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();
  
        if(!audioDestinationRef.current) {
             audioDestinationRef.current = ctx.createMediaStreamDestination();
        }
        const dest = audioDestinationRef.current;
  
        // Cleanup previous graph
        if (audioGraphRef.current.source) {
            try { audioGraphRef.current.source.disconnect(); } catch(e) {}
        }
        audioGraphRef.current.nodes.forEach(n => {
            try { n.disconnect(); } catch(e) {}
        });
        audioGraphRef.current.nodes = [];
  
        const sourceStream = originalAudioStreamRef.current;
        const source = ctx.createMediaStreamSource(sourceStream);
        audioGraphRef.current.source = source;
        
        let finalOutput: AudioNode = source;
  
        if(effect === 'man') {
             const biquad = ctx.createBiquadFilter();
             biquad.type = 'lowshelf';
             biquad.frequency.value = 200;
             biquad.gain.value = 15;
             source.connect(biquad);
             const compressor = ctx.createDynamicsCompressor();
             biquad.connect(compressor);
             finalOutput = compressor;
             audioGraphRef.current.nodes.push(biquad, compressor);
  
        } else if (effect === 'woman') {
             const biquad = ctx.createBiquadFilter();
             biquad.type = 'highshelf';
             biquad.frequency.value = 2000;
             biquad.gain.value = 15;
             const biquad2 = ctx.createBiquadFilter();
             biquad2.type = 'peaking';
             biquad2.frequency.value = 1000;
             biquad2.Q.value = 1;
             biquad2.gain.value = 5;
             source.connect(biquad);
             biquad.connect(biquad2);
             finalOutput = biquad2;
             audioGraphRef.current.nodes.push(biquad, biquad2);
  
        } else if (effect === 'robot') {
             const osc = ctx.createOscillator();
             osc.frequency.value = 50; 
             osc.type = 'sawtooth';
             osc.start();
             const ringGain = ctx.createGain();
             ringGain.gain.value = 0.0; 
             source.connect(ringGain);
             osc.connect(ringGain.gain);
             finalOutput = ringGain;
             audioGraphRef.current.nodes.push(osc, ringGain);
  
        } else if (effect === 'echo') {
             const delay = ctx.createDelay();
             delay.delayTime.value = 0.2;
             const feedback = ctx.createGain();
             feedback.gain.value = 0.4;
             source.connect(delay);
             delay.connect(feedback);
             feedback.connect(delay);
             source.connect(dest);
             delay.connect(dest);
             audioGraphRef.current.nodes.push(delay, feedback);
             finalOutput = null as any; 
        }
  
        if (finalOutput) {
             finalOutput.connect(dest);
        }
  
        processingNodeRef.current = finalOutput || dest;
  
        const newTrack = dest.stream.getAudioTracks()[0];
        peersRef.current.forEach(p => {
              if(p.peer && !p.peer.destroyed) {
                  const pc = (p.peer as any)._pc; 
                  if (pc) {
                      const senders = pc.getSenders();
                      const audioSender = senders.find((s: RTCRtpSender) => s.track && s.track.kind === 'audio');
                      if(audioSender) {
                          audioSender.replaceTrack(newTrack).catch((e: any) => console.log("Replace Track Error", e));
                      }
                  }
              }
        });
    };
  
    const toggleHearMyself = () => {
        const newState = !hearMyself;
        setHearMyself(newState);
        if (processingNodeRef.current && audioContextRef.current) {
            if (newState) {
                processingNodeRef.current.connect(audioContextRef.current.destination);
            } else {
                try { processingNodeRef.current.disconnect(audioContextRef.current.destination); } catch(e) {}
            }
        }
    };

    return {
        voiceEffect,
        hearMyself,
        applyVoice,
        toggleHearMyself
    };
};
