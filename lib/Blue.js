const axios = require("axios");
const { EventEmitter } = require("events");
const BlueNode = require("./node/BlueNode.js");
const Player = require("./player/BluePlayer.js");
const { ClientName } = require("./info.json");
const Spotify = require("./player/BluePlatform.js")
let platform = {
  "youtube": "ytsearch",
  "youtube music": "ytmsearch",
  "soundcloud": "scsearch",
  "spotify": "spsearch",
  "deezer": "dzsearch",
  "apple music": "apsearch",
  "amazon music": "azsearch",
  "mixcloud": "mxsearch"
}, arr = ["youtube", "youtube music", "soundcloud", "spotify", "deezer", "apple music", "amazon music", "mixcloud"]
class Blue extends EventEmitter {
  constructor(nodes, options={}){
    super();
    if (!nodes)
      throw new Error("Blue Error :: You didn't provide a lavalink node");
    this.client = null;
    this.nodes = new Map();
    this._nodes = nodes;
    this.spotify = new Spotify(this);
    this.players = new Map();
    this.requester = undefined;
    this.data = null;
    this.guildId = null;
    this.autoplay = options.autoplay || false;
    this.defaultSearchPlatform = (arr.includes(options.defaultSearchPlatform.toLowerCase())  === true ? platform[options.defaultSearchPlatform.toLowerCase()] : "ytmsearch") || "ytmsearch";
    this.node = null;
    this.address = null;
    this.interval = 0;
    this.players = new Map();
    this.track = null;
    this.info = {};
    this.port = null;
    this.password = null;
    this.secure = null;
  }
  
  init(client){
    this.client = client.user.id;
   this._nodes.forEach((node)=>{
     const { host, port, password, secure } = node;
     this.address = host;
     this.port = port;
     this.password = password;
     this.secure = secure;
     this.sendGuildData = (data) => {
       const guild = client.guilds.cache.get(data.d.guild_id);
       if(guild) guild.shard?.send(data)
     }
     this.nodes.set(this.address, node)
     this.data = this.nodes.get(this.address) || null;
     this.node = new BlueNode(this, node)
    client.on("raw", async(packet) => {
      await this.node.updateVoice(packet);
    })
     this.node.connect();
   })
  }
  
  create(options={}) {
    let { guildId, voiceChannel, textChannel } = options;
    if (!guildId)
      throw new Error(`blue.js Error :: Provide the proper guildId`);
    if (typeof guildId !== "string")
      throw new TypeError(`blue.js Error :: the option 'guildId' must not be non-string, but recieved '${typeof guildId}' type!`);
  this.guildId = guildId;
    if (!voiceChannel)
      throw new TypeError(`blue.js Error :: Provide the proper VoiceChannel ID`);
    if (typeof voiceChannel !== "string")
      throw new TypeError(
        `blue.js :: the option 'voiceChannel' must not be non-string, but recieved '${typeof voiceChannel}' type!`
      );
    if (!textChannel)
      throw new TypeError(`blue.js Error :: Provide the proper TextChannel ID`);
    if (typeof textChannel !== "string")
      throw new TypeError(
        `blue.js :: the option 'textChannel' must not be non-string, but recieved '${typeof textChannel}' type!`
      );
    const player = this.players.get(options.guildId);
    if (player) return player;
    
    let node = this.nodes.get(this.address)
    if (!node) throw new TypeError("blue.js Error :: No nodes are avalible");

     if (this.players.has(options.guildId))
      return this.players.get(options.guildId);

    const players = new Player(this, options);
    this.players.set(options.guildId, players);
    players.connect(options);
    return players;
  }
  
     async search(param, requester) {
       this.requester = requester;
       let spotify = /^(?:https:\/\/open\.spotify\.com\/(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track|artist)(?:[/:])([A-Za-z0-9]+).*$/
       let query, source;
         query = param;
       if(typeof param == "object"){
         if(/(?:https?|ftp):\/\/[\n\S]+/gi.test(param.query)){
        query = param.query;
           if(spotify.test(param.query)){
         const [, type, id] = spotify.exec(query) ?? [];
             if(type == "playlist"){
           return await this.spotify.search(query);
         }
            query = await this.spotify.search(param.query);
           }
         } else {
        query = param.query;
        source = arr.includes(param.source) === true ? platform[param.source.toLowerCase()] : 'ytmsearch';
         }
       } else {
        if(spotify.test(param)){
         const [, type, id] = spotify.exec(query) ?? [];
         if(type == "playlist"){
           return await this.spotify.search(query);
         }
            query = await this.spotify.search(param);
           } 
       }
       
    if (!this.nodes?.get(this.address)) throw new Error("No nodes are available.");
       let engine = source || this.defaultSearchPlatform;
        
    if (/(?:https?|ftp):\/\/[\n\S]+/gi.test(query)) {
      const result = await this.fetchData(
        "loadtracks",
        `identifier=${encodeURIComponent(query)}`
      );
      if (!result || result.tracks.length === 0){ 
        throw new Error("No tracks found.");
      }
      return result.tracks;
    } else {
      let track = `${engine}:${query}`;
        const result = await this.fetchData(
          "loadtracks",
          `identifier=${encodeURIComponent(track)}`
        );
    
        if (!result || result.tracks.length === 0){ 
        throw new Error("No tracks found.");
      }
      return result.tracks;
    }
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
  async fetchData(endpoint, param) {
    try {
    let { data } = await axios.get(
      `htt${this.secure ? "ps" : "p"}://${this.address}:${this.port
      }/${endpoint}?${param}`,
      {
        headers: {
          'Authorization': this.password,
        'User-Id': this.client,
        'Client-Name': ClientName
        }
      }
    )
      //data.tracks[0].info.sourceName="spotify";
       return data;
    
  } catch(e) {
        throw new Error(
          `blue.js :: unable to fetch data from the lavalink.\n  Error message: ${e}`
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
