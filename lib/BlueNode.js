const Socket = require("ws")
const { ClientName } = require("./info.json")
class BlueNode {
  constructor(blue, node, client){
    this.blue = blue;
    this.client = client;
    this.node = node;
    this.index = 0;
    this.sessionId = null;
    this.region = null;
    this.muted = false;
    this.stats = null;
    this.deafened = false;
    this.address = node.host;
    this.port = node.port;
    this.password = node.password;
    this.secure = node.secure;
  }
  connect(){
    if(this.ws) return this.ws.close();
    this.ws = new Socket(`w${this.secure ? "ss" : "s"}://${this.address}:${this.port}`,{
      headers: {
        "Authorization": this.password,
        "Client-Name": ClientName,
        "User-Id": this.client.user.id,
      }
    })
    this.ws.on("open", this.open.bind(this));
    this.ws.on("close", this.close.bind(this));
    this.ws.on("message", this.message.bind(this));
    this.ws.on("error", this.error.bind(this));
  }
  open(){
    this.blue.emit("lavalinkConnect", this, `blue.js ${this.address} :: Lavalink successfully connected!`);
  }
  close(){
    let timeout;
    this.blue.emit("lavalinkDisconnect", this, `blue.js ${this.address} :: Lavalink disconnected!`);
    this.index++
    if(this.index >= 10) {
    this.blue.emit("lavalinkError", "blue.js error :: After Several tries i couldn't connect to the lavalink!")
    clearTimeout(timeout);
    return this.ws.close();
    } 
    timeout=setTimeout(async function(){
    await this.reconnect();
    }, 3000)
  }
 async reconnect(){
    this.connect()
  }
  send(payload){
    new Promise((resolve, reject) => {
      let data = JSON.stringify(payload);
      if(data){
        resolve(data);
        this.ws.send(data, (error) => {
      if (error) new Error(error); 
          else
      return;
    });
      } else {
        reject(data);
        console.log("Unknown payload!");
      }
    })
  }
  async packetUpdate(packet){
    if (!["VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE"].includes(packet.t)) return;
        const player = this.blue.players.get(packet.d.guild_id);
    if (!player) return;
    if (packet.t === "VOICE_SERVER_UPDATE") {
      this.setVoiceStateUpdate(packet.d);
    }
    if (packet.t === "VOICE_STATE_UPDATE") {
      if (packet.d.user_id !== this.blue.client.user.id) return;
     this.setServerStateUpdate(packet.d);
    }
  }
  setServerStateUpdate(data){
    const { session_id, channel_id, guild_id, self_deaf, self_mute } = data;
    this.sessionId = session_id;
    this.channelId = channel_id;
    this.guildId = guild_id;
    this.muted = self_mute || false;
    this.defeaned = self_deaf || false;
    this.blue.emit("voiceUpdate", `[Voice] <- [Discord] :: State Update Received | Channel: ${this.channelId} Session ID: ${session_id} Guild: ${this.guildId}`)
  }
  setVoiceStateUpdate(data){
    if(!data?.endpoint) return this.blue.emit("lavalinkError", "blue.js error :: Unable to fetch the endpoint to connect to the voice channel!");
        if (!this.sessionId) return this.blue.emit('lavalinkError', "lavalinkError", "blue.js error :: Unable to fetch the sessionId to connect to the voice channel!");
        this.region = data.endpoint.split('.').shift()?.replace(/[0-9]/g, '') || null;
        this.send({ op: "voiceUpdate", guildId: this.guildId, sessionId: this.sessionId, event: data });
        this.blue.emit("debug",this.address ,`[Voice] <- [Discord] : Voice Server Update | Server: ${this.region} Guild: ${this.guildId}`)
  }
  message(payload){
  const packet = JSON.parse(payload);
    if (!packet?.op) return;
    switch(packet.op){
      case "stats":
      delete packet.op;
      this.stats = { ...packet }
        break;
      case "event":
        this.blue.handleEvents(packet);
        break;
      case "playerUpdate": 
        const player = this.blue.players.get(packet?.guildId);
        if (player){ 
          player.position = packet.state.position || 0;
         player.isConnected = packet.state.connected;
        player.ping = packet.state.ping;
                   }
        break;
      default: 
         this.blue.emit(
          "nodeError",
          this,
          new Error(`Unexpected op "${payload.op}" with data: ${payload}`)
        );
        return;
    }
  }
  error(err){
    this.blue.emit("nodeError", err, `blue.js Error :: Unable to connect to lavalink!`);
  }
}

module.exports = BlueNode;


/* 
* Blue,
* A Lavalink Client,
* Made,
* By,
* Ashton#4218
*/
