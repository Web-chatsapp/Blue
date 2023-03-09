
let { Blue } = require("../blue.js")
const Discord = require("discord.js")
const client = new Discord.Client({
  fetchAllMembers: false,
  restTimeOffset: 0,
  failIfNotExists: false,
  shards: "auto",
  allowedMentions: {
    parse: ["roles", "users"],
    repliedUser: false,
  },
  partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'GUILD_MEMBER', 'USER'],
  intents: [Discord.Intents.FLAGS.GUILDS,
  Discord.Intents.FLAGS.GUILD_MEMBERS,
  Discord.Intents.FLAGS.GUILD_BANS,
  Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
  Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
  Discord.Intents.FLAGS.GUILD_WEBHOOKS,
  Discord.Intents.FLAGS.GUILD_INVITES,
  Discord.Intents.FLAGS.GUILD_VOICE_STATES,
  Discord.Intents.FLAGS.GUILD_PRESENCES,
  Discord.Intents.FLAGS.GUILD_MESSAGES,
  Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  Discord.Intents.FLAGS.DIRECT_MESSAGES,
  Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  ]
});
//lavalink node, multiple nodes can be putted.
let nodes = [{
  host: "lavalink.devamop.in",
  port: 443,
  password: "DevamOP",
  secure: true
}];

client.blue = new Blue(nodes)

client.on("ready", () => {
  console.log(`${client.user.username} successfully logged in!`);

  client.blue.init(client);
});
//error handling
process.on('unhandledRejection', (reason, p) => {
      console.log('[antiCrash] : Unhandled Rejection/Catch');
        console.log(reason, p);
    });
    process.on("uncaughtException", (err, origin) => {
        console.log('[antiCrash] : Uncaught Exception/Catch');
        console.log(err, origin);
    })
    process.on('uncaughtExceptionMonitor', (err, origin) => {
        console.log('[antiCrash] : Uncaught Exception/Catch');
        console.log(err, origin);
    });


  client.blue.on("lavalinkConnect", (node) => {
    console.log("lavalink connected", node.address)
  })
client.blue.on("trackStart", (player, track) => {
  console.log(client.blue.players.get(player.guildId).queue)
  let ch = client.channels.cache.get(player.textChannel)
  ch.send("started **"+track.title+"**")
})
client.blue.on("queueEnd", (track) => {
  console.log("queue ended")
  const players = client.blue.players.get(track.guildId);
  players.autoplay("noSkip") //if song queue ends then it will play another song automatically
})
client.on("messageCreate", async (message) => {
  let prefix = "+";
  if(!message.author) return;
  if(!message.guild || message.author.bot) return;
 // if(message.author.id === "849359686855950375") prefix=""
  if(!message.content.startsWith(prefix)) return;
  const args = message.content?.slice(prefix.length).trim().split(" ");
  const cmd = args.shift()?.toLowerCase();
  if(cmd=="skip"){
if(!message.member.voice.channel) return message.reply("**> First join any vc!**")
  const player = client.blue.players.get(message.guildId);
      if(player.queue.length > 0) {
        message.reply("> skipped ")
         player.stop()
        return player.play()
      } else {
        player.autoplay("skip")
        return message.reply("> stopped, no queue ")
      }
  }
  if(cmd=="eval"){
    try{
   const query = args.slice(0).join(" ");
    if(!query) return message.reply("> put some input to execute")
    const execute = eval(query);
      const result = JSON.stringify(execute)
    return message.reply(`\`\`\`js\n${result}\`\`\``)
    } catch(e){
      return message.reply(`\`\`\`js\n${e.message}\`\`\``)
    }
  }
  if (cmd=="play" || cmd=="p") {
if(!message.member.voice.channel) return message.reply("**> First join any vc!**")
    
    let query = args.slice(0).join(" ");
    if(!query) return message.reply("**> abe behen ka lund chuhe bina song query like (name or url) ke kiya mein tere lund me `Ladki aankh mare` gaana bajau?**");
    
 message.reply(`> Searching: **${query}**`);
    //searches the songs
    const res = await client.blue.search({query : query, source: "ytmsearch"})
    //new instance of vc connection
    const player = client.blue.create({
    voiceChannel: message.member.voice.channel.id,  
    guildId: message.guildId,
    textChannel: message.channel.id,
    selfDeaf: true
    })

    const track = res[0];
    console.log(track);
    player.queue.add(track);

      console.log(client.blue.players.get(player.guildId).queue)
    console.log(track)
    message.reply(`Queued Track \n \`${track.info.title}\``);

  if (!player.isPlaying && player.isConnected){ 
    await player.play();     //SONG PLAY METHOD
  }

  }
});

client.login("YOUR_BOT_TOKEN");  //PUT YOUR BOT TOKEN HERE

/*
* A 
* Testing Bot
* To test the wrapper
* Made
* By
* Ashton#4218
*/

/*
* If you consider to use this bot src, then credit is not 
  required. But if you are wondering to modify the wrapper code, 
  you have to give credits to Ashton "The Real Developer of 
  'Blue.js'". 
  For Example: "This wrapper is modified by "YOUR_NAME" and 
  genuinely made by "Ashton#4218".
  Thank you,
*/