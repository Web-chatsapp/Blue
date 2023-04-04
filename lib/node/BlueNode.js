const Socket = require("ws")
const { ClientName } = require("../info.json")
class BlueNode {
  constructor(blue, node){
    this.blue = blue;
    this.node = node;
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
    this.ws = new Socket(`w${this.secure ? "ss" : "s"}://${this.address}:${this.port}`,{
      headers: {
        "Authorization": this.password,
        "Client-Name": ClientName,
        "User-Id": this.blue.client,
      }
    })
    this.ws.on("open", this.open.bind(this));
    this.ws.on("close", this.close.bind(this));
    this.ws.on("message", this.message.bind(this));
    this.ws.on("error", this.error.bind(this));
  }
  open(){
    this.blue.emit("nodeConnect", this, `blue.js ${this.address} :: node successfully connected!`);
  }
  close(){
    let index = 0;
    this.blue.emit("nodeisconnect", this, `blue.js ${this.address} :: node disconnected!`);
    index++;
    if(index > 10) {
    this.blue.emit("nodeisconnect", this, "blue.js error :: After Several tries i couldn't connect to the lavalink!");
    index = 0;
    return this.ws.close();
    } 
     setTimeout(() => {
        this.connect();
    }, 5000)
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
        console.log("Recieved unknown payload!");
      }
    })
  }
  async updateVoice(packet){
    if ("t" in packet && !["VOICE_STATE_UPDATE", 
   "VOICE_SERVER_UPDATE"].includes(packet.t)) return;
        const player = this.blue.players.get(packet.d.guild_id);
    if (!player) return;
    if (packet.t === "VOICE_SERVER_UPDATE") {
      this.setVoiceStateUpdate(packet.d);
    }
    if (packet.t === "VOICE_STATE_UPDATE") {
      if (packet.d.user_id !== this.blue.client) return;
     this.setServerStateUpdate(packet.d);
    }
  }
  setServerStateUpdate(guildData){
    this.sessionId = guildData.session_id;
    this.channelId = guildData.channel_id;
    this.guildId = guildData.guild_id;
    this.muted = guildData.self_mute || false;
    this.defeaned = guildData.self_deaf || false;
    this.blue.emit("voiceUpdate", `[Voice] <- [Discord] :: State Update Received | Channel: ${this.channelId} Session ID: ${guildData.session_id} Guild: ${this.guildId}`)
  }
  setVoiceStateUpdate(data){
    if(!data?.endpoint) return this.blue.emit("nodeError", "blue.js error :: Unable to fetch the endpoint to connect to the voice channel!");
        if (!this.sessionId) return this.blue.emit('nodeError', "nodeError", "blue.js error :: Unable to fetch the sessionId to connect to the voice channel!");
        this.region = data.endpoint.split('.').shift()?.replace(/[0-9]/g, '') || null;
        this.send({ op: "voiceUpdate", guildId: this.guildId, sessionId: this.sessionId, event: data });
        this.blue.emit("api",this.address ,`blue.js :: Voice Server Update | Server: ${this.region}, Guild: ${this.guildId}, Session: ${this.sessionId}`)
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
          this.blue.emit("playerUpdate", player);
          player.position = packet.state.position || 0;
         player.state.connect = packet.state.connected;
                   }
        break;
      default: 
         this.blue.emit(
          "nodeError",
          this,
          new Error(`blue.js Error :: Unexpected op "${payload.op}" with data: ${payload}`)
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
