import { Client, Intents, Message } from "discord.js";
import { Blue } from "..";

interface SpotifyOptions {
  client_id: string;
  client_secret: string;
}

interface Node {
  host: string;
  port: number;
  password: string;
  secure: boolean;
}

const client: any = new Client({
  failIfNotExists: false,
  allowedMentions: {
    parse: ['roles', 'users'],
    repliedUser: false,
  },
  partials: [
    'MESSAGE',
    'CHANNEL',
    'REACTION',
    'GUILD_MEMBER',
    'USER'
  ],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_INTEGRATIONS,
    Intents.FLAGS.GUILD_WEBHOOKS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  ],
  presence: {
    activities: [
      {
        name: 'ashton.gg',
        type: "LISTENING",
      },
    ],
    status: 'online',
  }
});

const nodes: Node[] = [
  {
    host: "lavalink4-frankfurt.alfari.id",
    port: 443,
    password: "catfein",
    secure: true
  }
];

const options: any = {
  spotify: {
    client_id: "c46d6ce4936c41c6979f6d00eb2a6dd2",
    client_secret: "30a6c17b7fd64d4485b68c651d21b72f"
  }
};

client.manager = new Blue(nodes, options);

client.on("ready", async () => {
  console.log("ok logged in");
  client.manager.init(client);
});

client.manager.on("nodeConnect", (a: any, b: any) => {
  console.log(b);
});

client.manager.on("nodeDisconnect", (a: any, b: any) => {
  console.log(b);
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot || !message.guild || !message.channel) return;
  const prefix: string = ">";
  let player = client.manager.players.get(message.guild.id);
  if (!message.content.toLowerCase().startsWith(prefix)) return;
  const args: string[] = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd: string | undefined = args.shift()?.toLowerCase();
  if (cmd == "play") {
    if (!message.member?.voice.channel) return message.reply("you must be in a voice channel");
    const query: string = args.slice(0).join(" ");
    if (!query) return message.reply("provide the query");
    if (!player)
      player = await client.manager.create({
        voiceChannel: message.member.voice.channel.id,
        textChannel: message.channel.id,
        guildId: message.guild.id,
        selfDeaf: true,
        selfMute: false
      });
    const res: any = await client.manager.search({ query: query }, message.author);
    if (!res) return message.reply("song not found");
    if (res.loadType == "SPOTIFY_ALBUMS" || res.loadType == "SPOTIFY_PLAYLISTS") {
      player.queue.add(res.tracks);
    } else {
      player.queue.add(res.tracks[0]);
    }
    if (!player.queue?.current)
      player.play();
    return message.reply("queued song");
  }
  if (cmd == "skip") {
    if (!player || !player.isConnected) return message.reply("player not initialized yet.");
    if (player.queue.size() < 1) {
      player.disconnect();
      return message.reply("there's no song to skip.");
    }
    player.stop();
    return message.reply("skipped to the next song.");
  }

  if (cmd == "stop") {
    if (!player || !player.isConnected) return message.reply("player not initialized yet.");
    player.disconnect();
    return message.reply("stopped the song, and left the vc");
  }

  if (cmd == "replay") {
    if (!player || !player.queue.current) return message.reply("Nothing playing rn.");
    player.setSeek(0);
    return message.reply("alr playing from the beginning.");
  }

  if (cmd == "seek") {
    if (!args[0]) return message.reply("provide the position");
    if (!player || !player.queue.current) return message.reply("Nothing playing rn.");
    player.setSeek(args.slice(0).join(" "));
    return message.reply("alr player position sets to " + player.position);
  }
});

client.login("TOKEN");
