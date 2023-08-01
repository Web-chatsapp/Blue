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
    this.index = 0;
    this.deafened = true;
    this.address = node.host;
    this.resume = blue?.options?.resumekey || null;
    this.playerUpdate = blue?.options?.playerUpdateInterval || 50;
    this.port = node.port;
    this.password = node.password;
    this.secure = node.secure;
  }
  connect(){
    let headers = {
      "Authorization": this.password,
      "Client-Name": ClientName,
      "User-Id": this.blue.client.user.id
    };
    if(this.resume) headers["Resume-Key"] = this.resume;
    this.ws = new Socket(`w${this.secure ? "ss" : "s"}://${this.address}:${this.port}`,{ headers });
    this.ws.on("open", this.open.bind(this));
    this.ws.on("close", this.close.bind(this));
    this.ws.on("message", this.message.bind(this));
    this.ws.on("error", this.error.bind(this));
  }
  open(){
    if (this.resume)
      this.send({
        op: "configureResuming",
        key: String(this.resume),
        timeout: this.playerUpdate,
      });
    this.blue.emit("nodeConnect", this, `blue.js ${this.address} :: node successfully connected!`);
  }
  close(){
    this.blue.emit("nodeDisconnect", this, `blue.js ${this.address} :: node disconnected!`);
    this.index++;
    if(this.index > 10) {
    this.blue.emit("nodeDisconnect", this, "blue.js error :: After Several tries I couldn't connect to the lavalink!");
    this.index = 0;
    return this.ws.close();
    } 
     setTimeout(() => {
        this.connect();
    }, 5000);
  }
  send(payload){
    try {
    new Promise((resolve, reject) => {
      let data = JSON.stringify(payload);
      if(data){
        resolve(data);
        this.ws.send(data, (error) => {
      if (error) throw new Error(error); 
          else
      return this;
    });
      } else {
        reject(data);
        throw new Error("Recieved an unknown payload!");
      }
    });
  } catch(e){
    this.blue.emit("nodeError", e, new Error("blue.js Error :: Unable to send the data to the endpoint!"));
  }
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
      if (packet.d.user_id !== this.blue.client.user.id) return;
     this.setServerStateUpdate(packet.d);
    }
  }
  setServerStateUpdate(guildData){
    this.sessionId = guildData.session_id;
    this.channelId = guildData.channel_id;
    this.guildId = guildData.guild_id;
    this.muted = guildData.self_mute || false;
    this.defeaned = guildData.self_deaf || false;
    this.blue.emit("endpoint", `blue.js :: Voice Server State Updated | Channel ID: ${this.channelId} Session ID: ${guildData.session_id} Guild ID: ${this.guildId}`)
  }
  setVoiceStateUpdate(data){
    if(!data?.endpoint) return this.blue.emit("nodeError", data, new Error("blue.js error :: Unable to fetch the endpoint to connect to the voice channel!"));
        if (!this.sessionId) return this.blue.emit('nodeError', this, new Error("blue.js error :: Unable to fetch the sessionId to connect to the voice channel!"));
        this.region = data.endpoint.split('.').shift()?.replace(/[0-9]/g, '') || null;
        this.send({ op: "voiceUpdate", guildId: this.guildId, sessionId: this.sessionId, event: data });
        this.blue.emit("endpoint", this.address ,new Error(`blue.js :: Voice State Updated | Region: ${this.region}, Guild ID: ${this.guildId}, Session ID: ${this.sessionId}`))
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
         this.blue.emit("nodeError", this, new Error(`blue.js Error :: Unexpected op "${payload.op}" with data: ${payload}`)
        );
        return;
    }
  }
  error(err){
    this.blue.emit("nodeError", err, new Error("blue.js Error :: Unable to connect to lavalink!"));
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
