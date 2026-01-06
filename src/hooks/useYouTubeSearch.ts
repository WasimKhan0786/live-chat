import { useState } from 'react';

export interface SearchResult {
    id: string;
    title: string;
    thumbnail: string;
    timestamp: string;
    author: string;
    url: string;
}

export const useYouTubeSearch = () => {
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const searchVideos = async (query: string) => {
        if(!query.trim()) return;
        
        setIsSearching(true);
        setSearchResults([]);
        try {
            const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if(data.videos) {
                setSearchResults(data.videos);
            }
        } catch(e) {
            console.error("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    };

    return { searchResults, isSearching, searchVideos, setSearchResults };
};
