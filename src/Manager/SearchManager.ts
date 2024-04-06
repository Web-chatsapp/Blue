import { fetch } from "undici";
import Youtube from "../Platforms/Youtube";
import Soundcloud from "../Platforms/SoundCloud";
import Types from "../Utils/Types";
import Track from "../Structure/Track";
import Spotify from "../Platforms/Spotify";

class Search {
    private blue: any;
    private youtube: Youtube;
    private spotify: Spotify;
    private soundcloud: Soundcloud;

    constructor(blue: any) {
        this.blue = blue;
        this.youtube = new Youtube(this.blue);
        this.spotify = new Spotify(this.blue);
        this.soundcloud = new Soundcloud(this.blue);
    }

    async fetch(param: any) {
        let query = typeof param === "string" ? param : param?.query ? param?.query : null;
        let engine = param?.source || this.blue.options.defaultSearchEngine;
        if (!query) return null;

        const urlRegex = /(?:https?|ftp):\/\/[\n\S]+/gi;
        let result: any;

        if (urlRegex.test(query)) {
            const get_sp_link = await this.spotify.getSpotifyEntityInfo(query);
            if (get_sp_link?.album) {
                let albums: Track[] = [];
                for (let i in get_sp_link["album"]) {
                    let search: any = await this.youtube.search(get_sp_link["album"][i], "ytsearch").catch(() => null);
                    if (search.data[0]) albums.push(new Track(search.data[0]));
                }
                return {
                    loadType: Types.LOAD_SP_ALBUMS,
                    tracks: albums 
                };
            } else if (get_sp_link?.playlist) {
                let playlists: Track[] = [];
                for (let i in get_sp_link["playlist"]) {
                       let search: any = await this.youtube.search(get_sp_link["playlist"][i], "ytsearch").catch(() => null);
                       if (search) playlists.push(new Track(search.data[0]));
                }
                return {
                    loadType: Types.LOAD_SP_PLAYLISTS,
                    tracks: playlists
                };
            } else if (get_sp_link?.track) {
                result = await this.youtube.search(get_sp_link?.track, "ytsearch").catch(() => null);
            } else {
                result = await this.fetchRawData(`${this.blue.version}/loadtracks`, `identifier=${encodeURIComponent(query)}`);
            }
        } else {
            let track = `ytmsearch:${query}`;
            let data: any;
            if (engine === "youtube" || engine === "youtube music" || engine === "soundcloud") {
                switch (engine) {
                    case "youtube":
                        data = await this.youtube.search(query, "ytsearch").catch(() => null);
                        break;
                    case "youtube music":
                        data = await this.youtube.search(query, "ytmsearch").catch(() => null);
                        break;
                    case "soundcloud":
                        data = await this.soundcloud.search(query).catch(() => null);
                        break;
                }
                if (!data) return null;
                return data;
            } else if (engine === "spotify") {
                data = await this.spotify.search(query);
                result = await this.youtube.search(data, "ytsearch");
                } else {
                result = await this.youtube.search(track, "ytsearch");
            }
        }

        return result;
    }

    async fetchRawData(endpoint: string, identifier: string) {
        try {
                const url = `http${this.blue.options.secure ? "s" : ""}://${this.blue.options.host}:${this.blue.options.port}/${endpoint}?${identifier}`;
                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        'Authorization': this.blue.options.password
                    }
                });
    
                if (!response.ok) {
                    throw new Error(`Failed to fetch data: ${response.statusText}`);
                }
                const data = await response.json();
            return data;
        } catch (e) {
            console.log(e)
            throw new Error(
                `Unable to fetch data from the Lavalink server.`
            );
        }
    }

}

export default Search;