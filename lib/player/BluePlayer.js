
const BlueQueue = require("../Queue.js");
const { EventEmitter } = require("events");
const State = require("../node/BlueState.js")
class BluePlayerManager extends EventEmitter {
  constructor(blue, options){
    super();
    this.blue = blue;
    this.queue = new BlueQueue();
    this.state = new State();
    this.playing = false;
    this.position = 0;
    this.paused = false;
    this.createdTimestamp = Date.now();
    this.createdAt = new Date();
    this.guildId = options.guildId;
    this.voiceChannel = options.voiceChannel;
    this.textChannel = options.textChannel || null;
    this.options = {
    guildId: this.guildId,
    textChannel: this.textChannel,
    voiceChannel: this.voiceChannel 
    }
    this.loop = "NONE";
    this.blue.emit("playerCreate", this);
  }

    async play(options = {}) {
    if (!this.queue.length) return;
    this.queue.current = this.queue.shift();
      console.log("ok")
    console.log(this.queue.length)
    try {
      this.playing = true;
      this.position = 0;
      
      this.blue.node.send({
        op: "play",
        guildId: this.guildId,
        track: this.queue.current.track, 
        noReplace: options.noReplace || true
      });
      
      this.blue.node.send({
        op: "filters",
        guildId: this.guildId,
        equalizer: this.blue.defaultEQ()
      })

      this.blue.emit("debug", this.guildId, `blue.js :: Track :\n ${this.queue.current.info.title} is started to playing`);

      return this;

    } catch (e) {
      this.blue.emit("trackError", this, this.queue.current, null);
    }
  }

    stop(){
    this.position = 0;
    this.playing = false;
    this.blue.node.send({
      op: "stop",
      guildId: this.guildId,
    });
    return this;
  }

  pause(pause = true) {
    if (typeof pause !== "boolean")
      throw new RangeError("Pause function must be pass with boolean value.");

    this.blue.node.send({
      op: "pause",
      guildId: this.guildId,
      pause,
    });
    this.playing = pause ? false : true;
    this.paused = pause;

    return this;
  }

  async seekTo(position) {
    if (Number.isNaN(position)) throw new RangeError("[Poru Error] Position must be a number.");

    this.position = position;
    this.blue.node.send({
      op: "seek",
      guildId: this.guildId,
      position,
    });
    return this;
  }

  setVolume(volume) { 
    //Player.setVolume(Number) Number should be in between 1 and 100
    //currentVolume = Player.filters.volume*100 
    if (Number.isNaN(volume))
      throw new RangeError("blue.js :: Volume level must be a number.");
 
      if(volume < 1 && volume > 100)
      throw new RangeError("blue.js :: Volume Number should be in between 1 and 100");

      this.blue.node.send({
      op: "volume",
      guildId: this.guildId,
      volume: volume,
    });

      return this; }

  setLoop(mode) {
    if (!mode)
      throw new Error(
        `blue.js :: You must have to provide loop mode as argument of setLoop`
      );

    if (!["NONE", "TRACK", "QUEUE"].includes(mode))
      throw new Error(
        `blue.js :: setLoop arguments are NONE,TRACK AND QUEUE`
      );

    switch (mode) {
      case "NONE": {
        this.loop = "NONE";
        break;
      }
      case "TRACK": {
        this.loop = "TRACK";
        break;
      }
      case "QUEUE": {
        this.loop = "QUEUE";
        break;
      }
    }

    return this;
  }

  setTextChannel(channel) {
    if (typeof channel !== "string")
      throw new RangeError("Channel must be a string.");
    this.textChannel = channel;
    return this;
  }
  setVoiceChannel(channel) {
    if (typeof channel !== "string")
      throw new RangeError("Channel must be a string.");
    if(!this.state.connect) return;
    this.voiceChannel = channel;
    this.blue.sendGuildData({
      op: 4,
      d: {
        guild_id: this.guildId,
        channel_id: this.voiceChannel,
        self_deaf: true,
        self_mute: false,
      }
    })
    this.blue.emit(
      "debug",
      this.guildId,
      `blue.js :: Voice channel has been changed to ${channel}`
    );
  }
  
  connect(options = this) {
    let { guildId, voiceChannel } = options;
    this.send({
      guild_id: guildId,
      channel_id: voiceChannel,
      self_deaf: true,
      self_mute: false,
    }, true);
    
    this.state.connect = true;
    this.blue.emit(
      "debug",
      this.guildId,
      `blue.js :: Player has been connected`
    );
  }


  reconnect() {
    if (!this.voiceChannel) return;
    this.send({
      guild_id: this.guildId,
      channel_id: this.voiceChannel,
      self_mute: false,
      self_deaf: true,
    });

    return this;
  }

  disconnect() {
    if (this.voiceChannel === null) return null;
    this.pause(true);
    this.state.connect = false;
    this.send({
      guild_id: this.guildId,
      channel_id: null,
      self_mute: false,
      self_deaf: false,
    });
    this.voiceChannel = null;
    return this;
  }

  destroy() {
    this.disconnect();
    this.blue.node.send({
      op: "destroy",
      guildId: this.guildId,
    });

    this.blue.emit("playerDestroy", this);
    this.blue.emit(
      "debug",
      this.guildId,
      `blue.js :: destroyed the player`
    );
    this.blue.players.delete(this.guildId);
  }

  restart() {
    if (this.queue.current) {
      this.playing = true;
      this.blue.node.send({
        op: "play",
        startTime: this.position,
        noReplace: true,
        guildId: this.guildId,
        track: this.queue.current.track,
        pause: this.paused,
      });
    }
  }

  async autoplay() {
    try {
      let data = `https://www.youtube.com/watch?v=${this.queue.previous.info.identifier || this.queue.current.info.identifier
        }&list=RD${this.queue.previous.info.identifier || this.queue.current.info.identifier
        }`;
      
      let response = await this.blue.search(data);
      if (!response || response.length < 1) return this.stop();
      let track = response[Math.floor(Math.random() * Math.floor(response.length))];
      //track.info.requester = requester
      this.queue.add(track);
         return this.play();

    } catch (e) {
      console.log(`blue.js :: error : ${e.message}`);
      return this.stop();
    }
  }

  send(data) {
    this.blue.sendGuildData({ op: 4, d: data });
  }
  

      TrackStartEvent(player, track, payload) {
        this.playing = true;
        this.paused = false;
        this.blue.emit("trackStart", player, track, payload);
      }

      TrackEndEvent(player, track, payload) {
        this.queue.previous = this.queue.current;
        if (this.queue.current && this.loop === "TRACK") {
          this.queue.unshift(this.queue.previous);
          this.blue.emit("trackEnd", player, track, payload);
          return this.play();
        } else if (this.queue.current && this.loop === "QUEUE") {
          this.queue.push(this.queue.previous);
          this.blue.emit("trackEnd", player, track, payload);
          return this.play();
        }
        
        if (this.queue.length <= 0) {
          this.playing = false;
          if(this.blue.autoplay) {
          this.autoplay();
          return this.blue.emit("queueEnd", player, track, payload);
        }
          return this.blue.emit("queueEnd", player, track, payload);
        } else if (this.queue.length > 0) {
          this.blue.emit("trackEnd", player, track, payload);
          return this.play();
        }
        this.playing = false;
        this.blue.emit("queueEnd", player, track, payload);
      }
      TrackStuckEvent(player, track, payload) {
        this.blue.emit("trackError", player, track, payload);
        this.stop();
      }
      TrackExceptionEvent(player, track, payload) {
        this.blue.emit("trackError", player, track, payload);
        this.stop();
      }
      WebSocketClosedEvent(player, payload) {
        if ([4015, 4009].includes(payload.code)) {
          this.send({
            guild_id: player.guildId,
            channel_id: player.voiceChannel,
            self_mute: player.options.mute || false,
            self_deaf: player.options.deaf || false,
          });
        }
        this.blue.emit("nodeDisconnect", player, payload);
      }
}

module.exports = BluePlayerManager;


/* 
* Blue,
* A Lavalink Client,
* Made,
* By,
* Ashton#4218
*/
