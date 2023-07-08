const SpotifyWebApi = require('spotify-web-api-node');
let spotifyPattern =
  /^(?:https:\/\/open\.spotify\.com\/(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track|artist)(?:[/:])([A-Za-z0-9]+).*$/;
class Platform {
  constructor(blue){
    this.blue = blue;
    this.spotify = null;
    this.accessToken = null;
    this.spotifyConnection();
  }
  async spotifyConnection(){
    this.spotify = new SpotifyWebApi({
  clientId: 'c46d6ce4936c41c6979f6d00eb2a6dd2',
  clientSecret: '30a6c17b7fd64d4485b68c651d21b72f'
    })
    this.spotify.clientCredentialsGrant().then((data) => {
  this.accessToken = data.body['access_token'];
  this.spotify.setAccessToken(this.accessToken);
      }).catch((error) => {
  throw new Error('blue.js error :: ' + error);
});
  }

async search(query) {
  if (!this.spotify) await this.spotifyConnection();
  if (spotifyPattern.test(query)) {
    const [, type, id] = spotifyPattern.exec(query) ?? [];
    switch (type) {
      case "track":
        const data = await this.spotify.getTrack(query.split("track/")[1]);
        return `${data.body["name"]} ${data.body.artists.map(a => a.name).join(" ")}`;
      case "playlist":
        const tracks = [];
        const data1 = await this.spotify.getPlaylist(query.split("playlist/")[1]);
        data1.body.tracks.items.forEach((d) => {
          tracks.push(`${d.track.name} ${d.track.artists.map(a=>a.name).join(" ")}`);
        });
        const promises = tracks.map(async (t) => {
          const d = await this.blue.fetchData("v3/loadtracks", `identifier=${encodeURIComponent("ytmsearch:"+t)}`);
        d.tracks[0].info.requester = this.blue.requester;
          return d.tracks[0];
        const result = await Promise.all(promises);
        return result.flat();
      default:
        return "Unable to decode the link!";
    }
  } else {
    return "URL not valid!";
  }
}

}

module.exports = Platform;

/* 
* Blue,
* A Lavalink Client,
* Made,
* By,
* Ashton#4218
*/
