const fs = require("fs");
const ProgressBar = require("progress");
const axios = require("axios");
const prompt = require("prompt");

let { getPlaylist } = require("./src/getPlaylist.js");

const INFO_URL = "https://slider.kz/vk_auth.php?q=";
// const DOWNLOAD_URL = "https://slider.kz/download/";
let index = -1;
let songList = [];
let totalSongs = 0;
let notFound = [];

const download = async (song, url) => {
  let numb = index + 1;
  console.log(`\n(${numb}/${totalSongs}) Starting download: ${song}`);
  const { data, headers } = await axios({
    method: "GET",
    url: url,
    responseType: "stream",
  });

  //for progress bar...
  const totalLength = headers["content-length"];
  const progressBar = new ProgressBar("-> downloading [:bar] :percent :etas", {
    width: 40,
    complete: "=",
    incomplete: " ",
    renderThrottle: 1,
    total: parseInt(totalLength),
  });

  data.on("data", (chunk) => progressBar.tick(chunk.length));
  data.on("end", () => {
    console.log("DOWNLOADED!");
    startDownloading(); //for next song!
  });

  //for saving in file...
  data.pipe(fs.createWriteStream(`./songs/${song}.mp3`));
};

const getURL = async (song, singer) => {
  let query = `${song}%20${singer}`.replace(/\s/g, "%20");

  // console.log(INFO_URL + query);
  const { data } = await axios.get(INFO_URL + query);

  // when no result then [{}] is returned so length is always 1, when 1 result then [{id:"",etc:""}]
  if (!data["audios"][""][0].id) {
    //no result
    console.log("==[ SONG NOT FOUND! ]== : " + song);
    notFound.push(`${song} - ${singer}`);
    startDownloading();
    return;
  }

  //avoid remix,revisited,mix
  let i = 0;
  let track = data["audios"][""][i];
  let totalTracks = data["audios"][""].length;
  while (i < totalTracks && /remix|revisited|reverb|mix/i.test(track.tit_art)) {
    i += 1;
    track = data["audios"][""][i];
  }
  //if reach the end then select the first song
  if (!track) {
    track = data["audios"][""][0];
  }

  if (fs.existsSync(`./${song}/${track.tit_art}.mp3`)) {
    console.log(
      `\n(${index + 1}/${totalSongs}) - Song already present!! ${songName}`
    );

    startDownloading(); //next song
    return;
  }

  let link = track.url;
  link = encodeURI(link); //to replace unescaped characters from link

  let songName = track.tit_art;
  songName.replace(/\?|<|>|\*|"|:|\||\/|\\/g, ""); //removing special characters which are not allowed in file name
  download(songName, link);
};

const startDownloading = () => {
  index += 1;
  if (index === songList.length) {
    console.log("\n#### ALL SONGS ARE DOWNLOADED!! ####\n");
    console.log("Songs that are not found:-");
    let i = 1;
    for (let song of notFound) {
      console.log(`${i} - ${song}`);
      i += 1;
    }
    if (i === 1) console.log("None!");
    return;
  }
  let song = songList[index].name;
  let singer = songList[index].singer;
  getURL(song, singer);
};

const start = async () => {
  prompt.start();
  const { Playlist_URL } = await prompt.get(["Playlist_URL"]);
  // "https://www.resso.com/playlist/Love-and-Sad-Song-Best-Playlist-6949362741383780354"

  try {
    const res = await getPlaylist(Playlist_URL);
    console.log("Playlist Name: ", res.playlist);
    console.log("User Name: ", res.user);
    console.log("Total songs: ", res.songs.length);

    songList = res.songs;
    totalSongs = res.songs.length;

    //create folder
    let dir = "./songs";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    startDownloading();
  } catch (err) {
    console.log(err);
  }
};

start();
