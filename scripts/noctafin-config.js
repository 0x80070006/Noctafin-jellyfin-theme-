/* Edit this file to change the home page without touching the engine. */
window.NOCTAFIN_CONFIG = {
  locale: "fr-FR",
  hero: {
    enabled: true,
    rotateEveryMs: 7000,
    maxItems: 8
  },
  rows: {
    rowLimit: 18,
    minItems: 2,
    dedupeNativeRows: true,
    showStudioRail: true,
    showNetworkRail: true,
    showGenreRows: true,
    showStudioRows: true,
    showNetworkRows: true
  },
  genres: [
    { label: "Action", aliases: ["Action"] },
    { label: "Aventure", aliases: ["Adventure", "Aventure"] },
    { label: "Animation", aliases: ["Animation"] },
    { label: "Comédie", aliases: ["Comedy", "Comédie"] },
    { label: "Crime", aliases: ["Crime"] },
    { label: "Drame", aliases: ["Drama", "Drame"] },
    { label: "Fantastique", aliases: ["Fantasy", "Fantastique"] },
    { label: "Horreur", aliases: ["Horror", "Horreur"] },
    { label: "Science-fiction", aliases: ["Science Fiction", "Sci-Fi", "Science-fiction", "Science Fiction & Fantasy"] },
    { label: "Thriller", aliases: ["Thriller"] }
  ],
  studios: [
    { label: "PIXAR", aliases: ["Pixar", "Pixar Animation Studios"], colors: ["#00c6ff", "#2160ff"] },
    { label: "MARVEL", aliases: ["Marvel Studios", "Marvel Entertainment", "Marvel"], colors: ["#ff3548", "#7b0715"] },
    { label: "DISNEY", aliases: ["Walt Disney Pictures", "Walt Disney Animation Studios", "Disney"], colors: ["#2b7cff", "#7128ff"] },
    { label: "20TH CENTURY", aliases: ["20th Century Studios", "20th Century Fox", "Twentieth Century Fox"], colors: ["#ffb52e", "#ff5f22"] },
    { label: "COLUMBIA", aliases: ["Columbia Pictures", "Columbia"], colors: ["#25d7ff", "#725cff"] },
    { label: "PARAMOUNT", aliases: ["Paramount Pictures", "Paramount"], colors: ["#4e7cff", "#161a62"] }
  ],
  networks: [
    { label: "Apple TV+", aliases: ["Apple TV+", "Apple TV Plus", "Apple Studios", "Apple"], colors: ["#555a66", "#0d0f14"] },
    { label: "NETFLIX", aliases: ["Netflix"], colors: ["#e50914", "#69000a"] },
    { label: "BBC", aliases: ["BBC", "BBC One", "BBC Two", "BBC Three"], colors: ["#f1f1f1", "#5b606a"], darkText: true },
    { label: "CARTOON NETWORK", aliases: ["Cartoon Network"], colors: ["#08d8d8", "#b92dff"] },
    { label: "ABC", aliases: ["ABC", "American Broadcasting Company"], colors: ["#353945", "#08090d"] },
    { label: "MTV", aliases: ["MTV"], colors: ["#ff4fa3", "#7c5cff"] }
  ]
};
