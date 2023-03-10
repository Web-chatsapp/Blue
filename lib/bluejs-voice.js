const WebSocket = require('ws');
const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

function voiceChannelJoin(token, guildId, voiceChannelId){

ws.on('open', () => {
  const identifyData = JSON.stringify({
    op: 2,
    d: {
      token: token,
      intents: 513,
      properties: {
        $os: 'linux',
        $browser: 'nodejs',
        $device: 'nodejs'
      }
    }
  });

  ws.send(identifyData);
});

ws.on('message', (data) => {
  const response = JSON.parse(data);

  if (response.op === 10) {
    const heartbeatInterval = response.d.heartbeat_interval;
    setInterval(() => {
      ws.send(JSON.stringify({
        op: 1,
        d: null
      }));
    }, heartbeatInterval);

    // Send a Voice State Update request to join a voice channel
    const voiceStateUpdateData = JSON.stringify({
      op: 4,
      d: {
        guild_id: guildId,
        channel_id: voiceChannelId,
        self_mute: false,
        self_deaf: true
      }
    });

    ws.send(voiceStateUpdateData);
  }
});

}

module.exports.voiceChannelJoin = voiceChannelJoin;


/* 
* Blue,
* A Lavalink Client,
* Made,
* By,
* Ashton#4218
*/
