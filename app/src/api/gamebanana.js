window.GameBananaAPI = {
    baseUrl: "https://gamebanana.com/apiv11",
    gameId: 8694,

    getImageUrl(mod) {
        if (mod._aPreviewMedia && mod._aPreviewMedia._aImages && mod._aPreviewMedia._aImages.length > 0) {
            const img = mod._aPreviewMedia._aImages[0];
            return `${img._sBaseUrl}/${img._sFile}`;
        }
        return "https://images.gamebanana.com/img/ss/mods/default.jpg";
    },

    getValidRecords(data) {
        if (data && Array.isArray(data._aRecords)) return data._aRecords;
        if (Array.isArray(data)) return data;
        return [];
    },

    getTimeAgo(timestamp) {
        if (!timestamp) return "N/A";
        const seconds = Math.floor(Date.now() / 1000) - timestamp;
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        
        return Math.floor(seconds) + "s";
    },

    formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    async getModDetails(modId) {
        try {
            const res = await fetch(`${this.baseUrl}/Mod/${modId}/ProfilePage`);
            const data = await res.json();

            let images = [];
            if (data._aPreviewMedia && data._aPreviewMedia._aImages) {
                images = data._aPreviewMedia._aImages.map(img => `${img._sBaseUrl}/${img._sFile}`);
            }
            if (images.length === 0) images.push("https://images.gamebanana.com/img/ss/mods/default.jpg");

            let fileSize = 0;
            let downloadUrl = "";
            if (data._aFiles) {
                const filesArray = Object.values(data._aFiles);
                if (filesArray.length > 0) {
                    fileSize = filesArray[0]._nFilesize || 0;
                    downloadUrl = filesArray[0]._sDownloadUrl || "";
                }
            }

            return {
                id: data._idRow,
                title: data._sName,
                author: data._aSubmitter?._sName || "Unknown Creator",
                description: data._sText || "<p>No description available.</p>",
                likes: data._nLikeCount || 0,
                views: data._nViewCount || 0,
                timeAgo: this.getTimeAgo(data._tsDateAdded),
                images: images,
                fileSizeStr: this.formatBytes(fileSize),
                downloadUrl: downloadUrl
            };
        } catch (error) {
            console.error("Error loading mod details:", error);
            return null;
        }
    },

    async getFeaturedCarousel() {
        try {
            const rssRes = await fetch(`https://api.gamebanana.com/Rss/Featured?gameid=${this.gameId}`);
            let rssMods = [];
            
            if (rssRes.ok) {
                const xmlText = await rssRes.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(xmlText, "text/xml");
                const items = Array.from(xml.querySelectorAll("item"));
                
                rssMods = items.map((item, index) => {
                    const title = item.querySelector("title")?.textContent || "Unknown Mod";
                    const link = item.querySelector("link")?.textContent || "";
                    const image = item.querySelector("image")?.textContent || "https://images.gamebanana.com/img/ss/mods/default.jpg";
                    const id = link.split('/').pop() || index.toString();
                    const pubDate = item.querySelector("pubDate")?.textContent;
                    const ts = pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : 0;
                    
                    return { 
                        id, 
                        title, 
                        author: "Featured Creator", 
                        image, 
                        likes: 0, 
                        views: 0,
                        timeAgo: this.getTimeAgo(ts)
                    };
                });
            }

            const popRes = await fetch(`${this.baseUrl}/Mod/Index?_aFilters%5BGeneric_Game%5D=${this.gameId}&_nPage=1&_nPerpage=40`);
            let popMods = [];
            
            if (popRes.ok) {
                const data = await popRes.json();
                let records = this.getValidRecords(data);
                
                records.sort((a, b) => {
                    const scoreA = (a._nLikeCount || 0) + (a._nViewCount || 0);
                    const scoreB = (b._nLikeCount || 0) + (b._nViewCount || 0);
                    return scoreB - scoreA;
                });
                
                popMods = records.map(mod => ({
                    id: mod._idRow,
                    title: mod._sName,
                    author: mod._aSubmitter?._sName || "Unknown",
                    image: this.getImageUrl(mod),
                    likes: mod._nLikeCount || 0,
                    views: mod._nViewCount || 0,
                    timeAgo: this.getTimeAgo(mod._tsDateAdded)
                }));
            }

            let combined = [...rssMods, ...popMods];
            let uniqueMods = [];
            let seen = new Set();
            
            for (let m of combined) {
                if (!seen.has(m.id)) {
                    seen.add(m.id);
                    uniqueMods.push(m);
                }
            }

            const categories = [
                "Best of Today", "Best of This Week", "Best of This Month",
                "Best of 3 Months", "Best of 6 Months", "Best of This Year", "Best of All Time"
            ];

            return uniqueMods.slice(0, 21).map((mod, index) => {
                const categoryIndex = Math.floor(index / 3);
                mod.label = categories[categoryIndex] || "Featured";
                return mod;
            });
        } catch (error) {
            console.error("Error loading carousel mods:", error);
            return [];
        }
    },

    async getGridMods(filter = 'ripe', page = 1) {
        try {
            if (filter === 'ripe') {
                const res = await fetch(`${this.baseUrl}/Mod/Index?_aFilters%5BGeneric_Game%5D=${this.gameId}&_nPage=${page}&_nPerpage=20`);
                const data = await res.json();
                const records = this.getValidRecords(data);

                return records.slice(0, 12).map(mod => ({
                    id: mod._idRow,
                    title: mod._sName,
                    author: mod._aSubmitter?._sName || "Unknown",
                    image: this.getImageUrl(mod),
                    likes: mod._nLikeCount || 0,
                    views: mod._nViewCount || 0,
                    timeAgo: this.getTimeAgo(mod._tsDateAdded)
                }));
            } else {
                const isUpdated = filter === 'updated' ? '&include_updated=1' : '';
                const rssRes = await fetch(`https://api.gamebanana.com/Rss/New?gameid=${this.gameId}&itemtype=Mod&perpage=50${isUpdated}`);
                
                if (!rssRes.ok) throw new Error(`RSS Error: ${rssRes.status}`);
                
                const xmlText = await rssRes.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(xmlText, "text/xml");
                const items = Array.from(xml.querySelectorAll("item"));
                
                const startIndex = (page - 1) * 12;
                const paginatedItems = items.slice(startIndex, startIndex + 12);
                
                return paginatedItems.map((item, index) => {
                    const title = item.querySelector("title")?.textContent || "Unknown Mod";
                    const link = item.querySelector("link")?.textContent || "";
                    const image = item.querySelector("image")?.textContent || "https://images.gamebanana.com/img/ss/mods/default.jpg";
                    const id = link.split('/').pop() || index.toString();
                    
                    const pubDate = item.querySelector("pubDate")?.textContent;
                    const ts = pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : 0;
                    
                    return {
                        id: id,
                        title: title,
                        author: "Creator",
                        image: image,
                        likes: 0, 
                        views: 0,
                        timeAgo: this.getTimeAgo(ts)
                    };
                });
            }
        } catch (error) {
            console.error("Error loading grid mods:", error);
            return [];
        }
    },

    async searchMods(query, page = 1, perPage = 50) {
        try {
            const searchQuery = encodeURIComponent(query + ' fnf');
            const res = await fetch(`${this.baseUrl}/Util/Search/Results?_sModelName=Mod&_sSearchString=${searchQuery}&_nPage=${page}&_nPerpage=${perPage}`);
            const data = await res.json();
            const records = this.getValidRecords(data);

            let parsedMods = records.map(mod => ({
                id: mod._idRow,
                title: mod._sName,
                author: mod._aSubmitter?._sName || "Unknown",
                image: this.getImageUrl(mod),
                likes: mod._nLikeCount || 0,
                views: mod._nViewCount || 0,
                timeAgo: this.getTimeAgo(mod._tsDateAdded)
            }));

            parsedMods.sort((a, b) => {
                const scoreA = (a.likes * 10) + a.views;
                const scoreB = (b.likes * 10) + b.views;
                return scoreB - scoreA;
            });

            return parsedMods;
        } catch (error) {
            console.error("Error searching mods:", error);
            return [];
        }
    }
};
