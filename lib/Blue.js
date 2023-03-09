const axios = require("axios");
const { fetch } = require("undici");
let spotifyPattern =
  /^(?:https:\/\/open\.spotify\.com\/(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track|artist)(?:[/:])([A-Za-z0-9]+).*$/;
const { EventEmitter } = require("events");
const BlueNode = require("./BlueNode.js");
const Player = require("./BluePlayerManager.js");
const { ClientName } = require("./info.json");
class Blue extends EventEmitter {
  constructor(nodes, options={}){
    super();
    if (!nodes)
      throw new Error("Blue Error :: You didn't provide a lavalink node");
    this.client = null;
    this.nodes = new Map();
    this._nodes = nodes;
    this.players = new Map();
    this.data = null;
    this.guildId = null;
    this.defaultSearchPlatform = options.defaultSearchPlatform || "ytmsearch";
    this.node = null;
    this.name = new Map();
    this.address = null;
    this.baseURL = "https://api.spotify.com/v1";
    this.options = {
      playlistLimit: 20,
      albumLimit: 20,
      artistLimit: 20,
      searchMarket: 20,
      clientID: "c46d6ce4936c41c6979f6d00eb2a6dd2",
      clientSecret: "30a6c17b7fd64d4485b68c651d21b72f",
    };

    this.authorization = Buffer.from(
      `${this.options.clientID}:${this.options.clientSecret}`
    ).toString("base64");
    this.interval = 0;
    this.players = new Map();
    this.port = null;
    this.loadType = null;
    this.password = null;
    this.spotifyPlaylist = false;
    this.secure = null;
  }
  
  init(client){
    this.client = client;
   this._nodes.forEach((node)=>{
     this.address = node.host;
     this.port = node.port;
     this.password = node.password;
     this.secure = node.secure;
     this.sendGuildData = (data) => {
       const guild = client.guilds.cache.get(data.d.guild_id);
       if(guild) guild.shard?.send(data)
     }
     this.nodes.set(this.address, node)
     this.data = this.nodes.get(this.address) || null;
     this.node = new BlueNode(this, node, this.client)
    client.on("raw", async(packet) => {
      await this.node.packetUpdate(packet);
    })
     this.node.connect()
   })
  }
  defaultEQ(){
    return [{
        band: 0,
        gain: 0
      },
      {
        band: 1,
        gain: 0
      },
      {
        band: 2,
        gain: 0
      },
      {
        band: 3,
        gain: 0.01
      },
      {
        band: 4,
        gain: 0
      },
      {
        band: 5,
        gain: 0
      },
      {
        band: 6,
        gain: 0
      },
      {
        band: 7,
        gain: 0.025
      },
      {
        band: 8,
        gain: 0
      },
      {
        band: 9,
        gain: 0
      },
      {
        band: 10,
        gain: 0
      },
      {
        band: 11,
        gain: 0
      },
      {
        band: 12,
        gain: 0
      },
      {
        band: 13,
        gain: 0
      },
      {
        band: 14,
        gain: 0
      },
    ];
  }
checkConnection(options) {
    let { shardId, guildId, voiceChannel, textChannel } = options;
    if (!guildId)
      throw new Error(`blue.js :: Connection you have to Provide guildId`);
    if (!voiceChannel)
      throw new Error(`blue.js :: Connection you have to  Provide voiceChannel`);
    if (!textChannel)
      throw new Error(`blue.js :: Connection you have to  Provide textChannel`);

    if (typeof guildId !== "string")
      throw new Error(`blue.js :: Connection guildId must be provided as a string`);
  this.guildId = guildId;
    if (typeof voiceChannel !== "string")
      throw new Error(
        `blue.js :: Connection voiceChannel must be provided as a string`
      );
    if (typeof textChannel !== "string")
      throw new Error(
        `blue.js :: Connection textChannel must be provided as a string`
      );
  }
 createPlayer(node, options) {
    if (this.players.has(options.guildId))
      return this.players.get(options.guildId);

    const player = new Player(this, node, options);
    this.players.set(options.guildId, player);
    player.connect(this.client, options);
    return player;
  }
  create(options={}) {

    this.checkConnection(options);
    const player = this.players.get(options.guildId);
    if (player) return player;
    
    let node = this.nodes.get(this.address)
    if (!node) throw new Error("blue.js :: No nodes are avalible");

    return this.createPlayer(node, options);
  }
  
     async search(param) {
       let query, source;
         query = param;
       if(typeof param == "object"){
         if(/^https?:\/\//.test(param.query)){
        query = param.query;
         } else {
        query = param.query;
        source = param.source;
         }
       } 
       
    if (!this.nodes?.get(this.address)) throw new Error("No nodes are available.");
       let engine = source || this.defaultSearchPlatform;
        
    const regex = /^https?:\/\//;
    if (regex.test(query)) {
      if(spotifyPattern.test(query))
       return  this.spotifySearch(query).then(q=>q).then(parm=>this.searchQuery(parm.name, "ytmsearch"));
      
      return this.searchURL(query);
    } else {
      return this.searchQuery(query, engine);
    }
  }

  async spotifySearch(url) {
    try {
       const [, type, id] = spotifyPattern.exec(url) ?? [];
      const data = await fetch(
        "https://open.spotify.com/get_access_token?reason=transport&productType=embed",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
          },
        }
      );
      let data2;
      const body = await data.json();
      this.token = `Bearer ${body.accessToken}`;
      this.interval = body.accessTokenExpirationTimestampMs * 1000;
if (Date.now() >= this.interval) {
  console.log("ok")
      data2 = await fetch(
        "https://accounts.spotify.com/api/token?grant_type=client_credentials",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${this.authorization}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
  
      const body1 = await data2.json();

      this.token = `Bearer ${body1.access_token}`;
      this.interval = body1.expires_in * 1000;
}
    
       let endpoint;
      console.log(type, "4343434343334")
         switch (type) {
      case "playlist": {
        endpoint = `/playlists/${id}`;
        break;
      }
      case "track": {
        endpoint = `/tracks/${id}`;
        break;
      }
         }
         
            const req = await fetch(
      `${this.baseURL}${/^\//.test(endpoint) ? endpoint : `/${endpoint}`}`,
      {
        headers: { Authorization: this.token },
      }
    );
    const data1 = await req.json();
     if(type.includes("playlist")){
       this.spotifyPlaylist = true;
        console.log("ok")
         let tracks = await this.fetchSpotifyPlaylist(data1);
        return tracks.items;
     }
        return data1;
      
    } catch (e) {
      if (e.status === 400) {
        throw new Error("Invalid Spotify client.");
      }
    }
  }

  async fetchSpotifyPlaylist(playlist){
    return await playlist.tracks;
  }
  
  async searchURL(track) {
      const result = await this.fetch(
        "loadtracks",
        `identifier=${encodeURIComponent(track)}`
      );
      if (!result || result.length < 1){ 
        throw new Error("No tracks found.");
      }
    console.log(result?.loadType)
      return result.tracks;
    
  }

  async searchQuery(query, engine) {
        let track = `${engine}:${query}`;
        const result = await this.fetch(
          "loadtracks",
          `identifier=${encodeURIComponent(track)}`
        );
    
        if (!result) throw new Error("No tracks found.");
  console.log(result?.loadType)
      return result.tracks;
    }
      
      handleEvents(payload){
        if (!payload.guildId) return;
         const player = this.players.get(payload.guildId);
    if (!player) return;
        const track = player.queue.current.info;
    const type = payload.type;
        if (payload.type === "TrackStartEvent") {
      player.TrackStartEvent(player, track, payload);
    } else if (payload.type === "TrackEndEvent") {
      player.TrackEndEvent(player, track, payload);
    } else if (payload.type === "TrackStuckEvent") {
      player.TrackStuckEvent(player, track, payload);
    } else if (payload.type === "TrackExceptionEvent") {
      player.TrackExceptionEvent(player, track, payload);
    } else if (payload.type === "WebSocketClosedEvent") {
      player.WebSocketClosedEvent(player, payload);
    } else {
      const error = new Error(`Node#event unknown event '${type}'.`);
      this.emit("nodeError", this, error);
    }
      }
  async fetch(endpoint, param) {
    try {
    let { data } = await axios.get(
      `htt${this.secure ? "ps" : "p"}://${this.address}:${this.port
      }/${endpoint}?${param}`,
      {
        headers: {
          'Authorization': this.password,
        'User-Id': this.client.user.id,
        'Client-Name': ClientName
        }
      }
    )
      this.loadType = data?.loadType;
      data.tracks[0].info.sourceName="spotify"
      console.log(data) 
       return data;
    
  } catch(e) {
        throw new Error(
          `Failed to fetch from the lavalink.\n  error: ${e}`
        );
      };
  }
}

module.exports = Blue;


/* 
* Blue,
* A Lavalink Client,
* Made,
* By,
* Ashton#4218
*/