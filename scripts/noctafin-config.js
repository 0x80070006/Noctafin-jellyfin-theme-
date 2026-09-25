/* Lumo — user-facing configuration. Studio names are resolved against the
 * current Jellyfin server; IDs are never shared between installations. */
window.NOCTAFIN_CONFIG = {
  locale: "fr-FR",
  navigation: {
    preferHashRoutes: true,
    serverIdFallback: ""
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
  preview: {
    enabled: true,
    delayMs: 850
  },
  background: {
    image: "",
    imageBrightness: 0.72,
    overlayOpacity: 0.50
  },
  taxonomyHero: {
    enabled: true,
    maxItems: 24
  },
  details: {
    enabled: true,
    autoExpandFirstSeason: true,
    episodePageSize: 60
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
      label: "WALT DISNEY",
      aliases: ["Walt Disney Pictures", "Walt Disney Animation Studios", "Walt Disney"],
      colors: ["#2878ff", "#6427ef"],
      logo: "ui/noctafin-assets/logos/disney.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "20TH CENTURY FOX",
      aliases: ["20th Century Fox", "20th Century Studios", "Twentieth Century Fox"],
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
    },
    {
      label: "DREAMWORKS",
      aliases: ["DreamWorks Animation", "DreamWorks Pictures"],
      colors: ["#3974af", "#10233e"],
      logo: "ui/noctafin-assets/logos/dreamworks.svg",
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
      label: "Prime Video",
      aliases: ["Amazon Studios", "Amazon Prime Video", "Prime Video", "Amazon"],
      colors: ["#0c2639", "#071019"],
      logo: "ui/noctafin-assets/logos/prime-video.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "hulu",
      aliases: ["Hulu", "Hulu Originals"],
      colors: ["#133827", "#071b12"],
      logo: "ui/noctafin-assets/logos/hulu.svg"
    },
    {
      label: "NETFLIX",
      aliases: ["Netflix"],
      colors: ["#d81f26", "#31070a"],
      logo: "ui/noctafin-assets/logos/netflix.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "HBO MAX",
      aliases: ["HBO Max", "Max", "HBO"],
      colors: ["#2e154c", "#130b21"],
      logo: "ui/noctafin-assets/logos/hbo-max.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "Disney+",
      aliases: ["Disney+", "Disney Plus", "Disney"],
      colors: ["#112c4d", "#081422"],
      logo: "ui/noctafin-assets/logos/disney-plus.svg",
      logoFilter: "brightness(0) invert(1)"
    },
    {
      label: "PIXAR",
      kind: "studio",
      aliases: ["Pixar", "Pixar Animation Studios"],
      colors: ["#122c48", "#0b1728"],
      logo: "ui/noctafin-assets/logos/pixar.svg",
      logoFilter: "brightness(0) invert(1)"
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
