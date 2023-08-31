const axios = require("axios");
const cheerio = require("cheerio");
const htmlEntities = require("html-entities");

module.exports.getPlaylist = async () => {
  let playlistObj = {};
  let url =
    "https://www.resso.com/playlist/Love-and-Sad-Song-Best-Playlist-6949362741383780354"; //put your playlist url

  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const playlistName = $("div[class=playlist-info] h1").text().trim();
  const playlistUser = $("div[class=playlist-info] h3").text().trim();
  console.log(playlistName, playlistUser);

  playlistObj.playlist = htmlEntities.decode(playlistName);
  playlistObj.user = htmlEntities.decode(playlistUser);

  const tracksInfo = $("li[class=song-item]");
  playlistObj.songs = [];

  for (let track of tracksInfo) {
    let songName = $("h3", track).text();
    let singerName = $("p", track).text();

    singerName = singerName.replace(/\s{2,10}/g, ""); //remove spaces
    songName = songName.replace(/\?|<|>|\*|"|:|\||\/|\\/g, ""); //removing special characters which are not allowed in file name

    playlistObj.songs.push({
      name: htmlEntities.decode(songName),
      singer: htmlEntities.decode(singerName),
    });
  }
  // console.log(playlistObj);
  return playlistObj;
};
