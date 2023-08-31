const fs = require("fs");
var ProgressBar = require("progress");
const axios = require("axios");

const INFO_URL = "https://slider.kz/vk_auth.php?q=";
const DOWNLOAD_URL = "https://slider.kz/download/";
let index = -1;
let songsList = [];
let total = 0;
let notFound = [];

const download = async (song, url) => {
  let numb = index + 1;
  console.log(`(${numb}/${total}) Starting download: ${song}`);
  console.log(url);
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
  data.pipe(fs.createWriteStream(`${__dirname}/songs/${song}.mp3`));
};

const getURL = async (song, singer) => {
  let query = (song + "%20" + singer).replace(/\s/g, "%20");
  console.log(INFO_URL + query);
  const { data } = await axios.get(INFO_URL + query);

  // when no result then [{}] is returned so length is always 1, when 1 result then [{id:"",etc:""}]
  if (!data["audios"][""][0].id) {
    //no result
    console.log("==[ SONG NOT FOUND! ]== : " + song);
    notFound.push(song + " - " + singer);
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

  if (fs.existsSync(__dirname + "/songs/" + track.tit_art + ".mp3")) {
    let numb = index + 1;
    console.log(
      "(" + numb + "/" + total + ") - Song already present!!!!! " + song
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
  if (index === songsList.length) {
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
  let song = songsList[index].name;
  let singer = songsList[index].singer;
  getURL(song, singer);
};

console.log("STARTING....");
let playlist = require("./resso_playlist");
playlist.getPlaylist().then((res) => {
  console.log("Playlist Name: ", res.playlist);
  console.log("User Name: ", res.user);
  console.log("Total songs: ", res.songs.length);

  songsList = res.songs;
  total = res.songs.length;

  //create folder
  let dir = __dirname + "/songs";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  startDownloading();
});
