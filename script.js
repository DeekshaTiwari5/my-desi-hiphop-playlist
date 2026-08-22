// swap this for the "list=" param of any youtube.com/watch?...&list=... url
const PLAYLIST_ID = "PLHh6MzesvZMw";

const player = document.getElementById("player");

const artwork = document.getElementById("artwork");
const trackTitle = document.getElementById("trackTitle");
const trackArtist = document.getElementById("trackArtist");
const trackYear = document.getElementById("trackYear");

const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const currentTimeEl = document.getElementById("currentTime");
const durationTimeEl = document.getElementById("durationTime");

const volumeSlider = document.getElementById("volumeSlider");
const muteBtn = document.getElementById("muteBtn");

const playlistToggle = document.getElementById("playlistToggle");
const navSongs = document.getElementById("navSongs");
const navPlaylists = document.getElementById("navPlaylists");
const closePlaylist = document.getElementById("closePlaylist");
const playlistPanel = document.getElementById("playlistPanel");
const playlistList = document.getElementById("playlistList");
const overlay = document.getElementById("overlay");

let ytPlayer = null;
let videoIds = [];
let progressTimer = null;
const trackMetaCache = {};

window.onYouTubeIframeAPIReady = () => {
  ytPlayer = new YT.Player("ytPlayer", {
    height: "0",
    width: "0",
    playerVars: { listType: "playlist", list: PLAYLIST_ID },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
};

function onPlayerReady() {
  videoIds = ytPlayer.getPlaylist() || [];
  ytPlayer.setVolume(Number(volumeSlider.value) * 100);
  renderPlaylist();
  updateNowPlaying();
}

function onPlayerStateChange(event) {
  const playing = event.data === YT.PlayerState.PLAYING;
  setPlayingUI(playing);
  playing ? startProgressTimer() : stopProgressTimer();
  updateNowPlaying();
}

function currentVideoId() {
  return videoIds[ytPlayer.getPlaylistIndex()];
}

// YT error 2=invalid id, 5=html5 error, 100=removed/private, 101/150=embedding disabled by owner
function onPlayerError(event) {
  if (videoIds.length <= 1) return;
  ytPlayer.nextVideo();
}

function updateNowPlaying() {
  const index = ytPlayer.getPlaylistIndex();
  const videoId = videoIds[index];
  if (!videoId) return;

  artwork.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const meta = trackMetaCache[videoId];
  trackTitle.textContent = meta ? meta.title : "Loading…";
  trackArtist.textContent = meta ? meta.author : "YouTube Music";
  trackYear.textContent = videoIds.length ? `Track ${index + 1} of ${videoIds.length}` : "";

  highlightActiveSong(index);
}

function highlightActiveSong(index) {
  const items = playlistList.querySelectorAll("li");
  items.forEach((item, i) => item.classList.toggle("active", i === index));
}

function loadTrackMeta(videoId) {
  if (trackMetaCache[videoId]) return Promise.resolve(trackMetaCache[videoId]);
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}&format=json`;
  return fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return null;
      const meta = { title: data.title, author: data.author_name };
      trackMetaCache[videoId] = meta;
      return meta;
    })
    .catch(() => null);
}

function setPlayingUI(isPlaying) {
  playBtn.textContent = isPlaying ? "⏸" : "▶";
  playBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  player.classList.toggle("playing", isPlaying);
}

playBtn.addEventListener("click", () => {
  if (!ytPlayer || !ytPlayer.getPlayerState) return;
  if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
});

nextBtn.addEventListener("click", () => ytPlayer && ytPlayer.nextVideo());
prevBtn.addEventListener("click", () => ytPlayer && ytPlayer.previousVideo());

function startProgressTimer() {
  stopProgressTimer();
  progressTimer = setInterval(updateProgress, 500);
}

function stopProgressTimer() {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = null;
}

function updateProgress() {
  if (!ytPlayer || !ytPlayer.getDuration) return;
  const duration = ytPlayer.getDuration();
  if (!duration) return;
  const current = ytPlayer.getCurrentTime();
  progressFill.style.width = `${(current / duration) * 100}%`;
  currentTimeEl.textContent = formatTime(current);
  durationTimeEl.textContent = formatTime(duration);
}

progressBar.addEventListener("click", (e) => {
  if (!ytPlayer || !ytPlayer.getDuration) return;
  const duration = ytPlayer.getDuration();
  if (!duration) return;
  const rect = progressBar.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  ytPlayer.seekTo(ratio * duration, true);
});

function formatTime(seconds) {
  if (!isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

volumeSlider.addEventListener("input", () => {
  if (!ytPlayer) return;
  ytPlayer.setVolume(Number(volumeSlider.value) * 100);
  ytPlayer.unMute();
  muteBtn.textContent = Number(volumeSlider.value) === 0 ? "🔇" : "🔊";
});

muteBtn.addEventListener("click", () => {
  if (!ytPlayer) return;
  if (ytPlayer.isMuted()) {
    ytPlayer.unMute();
    muteBtn.textContent = "🔊";
  } else {
    ytPlayer.mute();
    muteBtn.textContent = "🔇";
  }
});

function renderPlaylist() {
  playlistList.innerHTML = "";

  videoIds.forEach((videoId, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="playlist-index">${String(index + 1).padStart(2, "0")}</span>
      <span>
        <span class="playlist-song-title">Track ${index + 1}</span><br>
        <span class="playlist-song-meta">YouTube Music</span>
      </span>
    `;
    li.addEventListener("click", () => {
      ytPlayer.playVideoAt(index);
      closePlaylistPanel();
    });
    playlistList.appendChild(li);

    loadTrackMeta(videoId).then((meta) => {
      if (!meta) return;
      li.querySelector(".playlist-song-title").textContent = meta.title;
      li.querySelector(".playlist-song-meta").textContent = meta.author;
      if (videoId === currentVideoId()) updateNowPlaying();
    });
  });

  highlightActiveSong(ytPlayer.getPlaylistIndex());
}

function openPlaylistPanel() {
  playlistPanel.classList.add("open");
  overlay.classList.add("show");
}

function closePlaylistPanel() {
  playlistPanel.classList.remove("open");
  overlay.classList.remove("show");
}

playlistToggle.addEventListener("click", openPlaylistPanel);
navSongs.addEventListener("click", (e) => { e.preventDefault(); openPlaylistPanel(); });
navPlaylists.addEventListener("click", (e) => { e.preventDefault(); openPlaylistPanel(); });
closePlaylist.addEventListener("click", closePlaylistPanel);
overlay.addEventListener("click", closePlaylistPanel);

const LISTENERS_MIN = 393;
const LISTENERS_MAX = 604;

const listenersCountEl = document.getElementById("listenersCount");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let listenerCount = randomInt(LISTENERS_MIN, LISTENERS_MAX);

function updateListenerCount() {
  const step = randomInt(-15, 15); // drift instead of jump
  listenerCount = Math.min(LISTENERS_MAX, Math.max(LISTENERS_MIN, listenerCount + step));
  if (listenersCountEl) listenersCountEl.textContent = listenerCount.toLocaleString();
}

updateListenerCount();
setInterval(updateListenerCount, 2500);