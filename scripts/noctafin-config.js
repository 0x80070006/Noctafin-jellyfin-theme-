/* Lumo — user-facing configuration.
 * Keep server-specific taxonomy IDs here so the home shortcuts always open
 * the exact native Jellyfin list pages from this server.
 */
window.NOCTAFIN_CONFIG = {
  locale: "fr-FR",
  navigation: {
    preferHashRoutes: true,
    serverIdFallback: "511869ce609a4d21843387817a028dda"
  },
  brand: {
    name: "Lumo",
    logoBlue: "ui/noctafin-assets/seasonal/lumo-blue.webp",
    logoHalloween: "ui/noctafin-assets/seasonal/lumo-halloween.webp",
    logoChristmas: "ui/noctafin-assets/seasonal/lumo-christmas.webp"
  },
  seasonal: {
    enabled: true,
    forceSeason: "auto",
    halloweenMonth: 10,
    christmasMonth: 12,
    halloweenBackground: "ui/noctafin-assets/seasonal/background-halloween.webp",
    christmasBackground: "ui/noctafin-assets/seasonal/background-christmas.webp",
    backgroundBlurPx: 8,
    backgroundBrightness: 0.56
  },
  hero: {
    enabled: true,
    rotateEveryMs: 7000,
    maxItems: 8
  },
  background: {
    image: "ui/noctafin-assets/background/lumo-space.webp",
    imageBrightness: 0.72,
    overlayOpacity: 0.50
  },
  taxonomyHero: {
    enabled: true,
    maxItems: 24
  },
  rows: {
    rowLimit: 12,
    dailyPoolLimit: 96,
    minItems: 2,
    scrollFactor: 1,
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
      id: "a1384420050b89ea581e04c0dd9a83a8",
      aliases: ["Pixar", "Pixar Animation Studios"],
      colors: ["#00b9ff", "#1555e8"],
      logo: "ui/noctafin-assets/logos/pixar.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "MARVEL",
      id: "92e087260fb84bbba21ef249122925df",
      aliases: ["Marvel Studios", "Marvel Entertainment", "Marvel"],
      colors: ["#ff304e", "#7d0618"],
      logo: "ui/noctafin-assets/logos/marvel-studios.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "WALT DISNEY",
      id: "ff966337d51b0e006da6e16df7cb7ca1",
      aliases: ["Walt Disney Pictures", "Walt Disney Animation Studios", "Disney", "Walt Disney"],
      colors: ["#2878ff", "#6427ef"],
      logo: "ui/noctafin-assets/logos/disney.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "20TH CENTURY FOX",
      id: "da8c4e8ad6d11fba2241aebbf643bed7",
      aliases: ["20th Century Studios", "20th Century Fox", "Twentieth Century Fox"],
      colors: ["#ffb52e", "#e14f18"],
      logo: "ui/noctafin-assets/logos/20th-century.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "COLUMBIA",
      id: "3e8c9b438ab4664dc15b8cdbfce57134",
      aliases: ["Columbia Pictures", "Columbia"],
      colors: ["#28c9ff", "#5653e6"],
      logo: "ui/noctafin-assets/logos/columbia.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "PARAMOUNT",
      id: "2672ed34a3f2b0bb6b4257c2ab9875b7",
      aliases: ["Paramount Pictures", "Paramount"],
      colors: ["#4e7cff", "#161a62"],
      logo: "ui/noctafin-assets/logos/paramount.svg",
      logoFilter: "brightness(0) invert(1)"
    }
  ],
  networks: [
    {
      label: "Apple TV+",
      id: "865e87e3544b4bcd5f1fcd3f7b8358e8",
      aliases: ["Apple TV+", "Apple TV Plus", "Apple Studios", "Apple"],
      colors: ["#434853", "#0a0c11"],
      logo: "ui/noctafin-assets/logos/apple-tv-plus.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "NETFLIX",
      id: "411cb7d6c12c8bf0d3c1caed22120c6f",
      aliases: ["Netflix"],
      colors: ["#d81f26", "#31070a"],
      logo: "ui/noctafin-assets/logos/netflix.svg"
    },
    {
      label: "BBC",
      id: "c39802fd4af78383c08c5ef2056d2ca7",
      aliases: ["BBC", "BBC One", "BBC Two", "BBC Three"],
      colors: ["#30343d", "#080a0e"],
      logo: "ui/noctafin-assets/logos/bbc.svg"
    },
    {
      label: "CARTOON NETWORK",
      id: "05d703671f62d4d6ee1a3636b89add52",
      aliases: ["Cartoon Network"],
      colors: ["#15d3dc", "#8b38ef"],
      logo: "ui/noctafin-assets/logos/cartoon-network.svg"
    },
    {
      label: "ABC",
      id: "96b48893d56b599270991d22c7a88280",
      aliases: ["ABC", "American Broadcasting Company"],
      colors: ["#353945", "#08090d"],
      logo: "ui/noctafin-assets/logos/abc.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "MTV",
      id: "ec5ae1b12f4efbf619aa77ca1bcd2d6f",
      aliases: ["MTV"],
      colors: ["#ff4fa3", "#7547dd"],
      logo: "ui/noctafin-assets/logos/mtv.svg"
    }
  ]
};
