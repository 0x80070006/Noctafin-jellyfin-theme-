/* Edit this file to change the home page without touching the engine. */
window.NOCTAFIN_CONFIG = {
  locale: "fr-FR",
  brand: {
    name: "Lumo",
    logoBlue: "ui/noctafin-assets/seasonal/lumo-blue.png",
    logoHalloween: "ui/noctafin-assets/seasonal/lumo-halloween.png",
    logoChristmas: "ui/noctafin-assets/seasonal/lumo-christmas.png"
  },
  seasonal: {
    enabled: true,
    forceSeason: "auto",
    halloweenMonth: 10,
    christmasMonth: 12,
    halloweenBackground: "ui/noctafin-assets/seasonal/background-halloween.png",
    christmasBackground: "ui/noctafin-assets/seasonal/background-christmas.png",
    backgroundBlurPx: 8,
    backgroundBrightness: 0.56
  },
  hero: {
    enabled: true,
    rotateEveryMs: 7000,
    maxItems: 8
  },
  rows: {
    rowLimit: 20,
    minItems: 2,
    browsePageLimit: 120,
    scrollFactor: 0.82,
    dedupeNativeRows: true,
    hideNativeHomeRows: true,
    showResumeRow: true,
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
    {
      label: "PIXAR",
      aliases: ["Pixar", "Pixar Animation Studios"],
      colors: ["#00b9ff", "#1555e8"],
      logo: "ui/noctafin-assets/logos/pixar.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "MARVEL",
      aliases: ["Marvel Studios", "Marvel Entertainment", "Marvel"],
      colors: ["#ff304e", "#7d0618"],
      logo: "ui/noctafin-assets/logos/marvel-studios.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "DISNEY",
      aliases: ["Walt Disney Pictures", "Walt Disney Animation Studios", "Disney"],
      colors: ["#2878ff", "#6427ef"],
      logo: "ui/noctafin-assets/logos/disney.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "20TH CENTURY",
      aliases: ["20th Century Studios", "20th Century Fox", "Twentieth Century Fox"],
      colors: ["#ffb52e", "#e14f18"],
      logo: "ui/noctafin-assets/logos/20th-century.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "COLUMBIA",
      aliases: ["Columbia Pictures", "Columbia"],
      colors: ["#28c9ff", "#5653e6"],
      logo: "ui/noctafin-assets/logos/columbia.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "PARAMOUNT",
      aliases: ["Paramount Pictures", "Paramount"],
      colors: ["#4e7cff", "#161a62"],
      logo: "ui/noctafin-assets/logos/paramount.svg",
      logoFilter: "brightness(0) invert(1)"
    }
  ],
  networks: [
    {
      label: "Apple TV+",
      aliases: ["Apple TV+", "Apple TV Plus", "Apple Studios", "Apple"],
      colors: ["#434853", "#0a0c11"],
      logo: "ui/noctafin-assets/logos/apple-tv-plus.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "NETFLIX",
      aliases: ["Netflix"],
      colors: ["#1a1014", "#050508"],
      logo: "ui/noctafin-assets/logos/netflix.svg"
    },
    {
      label: "BBC",
      aliases: ["BBC", "BBC One", "BBC Two", "BBC Three"],
      colors: ["#30343d", "#080a0e"],
      logo: "ui/noctafin-assets/logos/bbc.svg"
    },
    {
      label: "CARTOON NETWORK",
      aliases: ["Cartoon Network"],
      colors: ["#15d3dc", "#8b38ef"],
      logo: "ui/noctafin-assets/logos/cartoon-network.svg"
    },
    {
      label: "ABC",
      aliases: ["ABC", "American Broadcasting Company"],
      colors: ["#353945", "#08090d"],
      logo: "ui/noctafin-assets/logos/abc.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "MTV",
      aliases: ["MTV"],
      colors: ["#ff4fa3", "#7547dd"],
      logo: "ui/noctafin-assets/logos/mtv.svg"
    }
  ]
};
