import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Wiki DnD",
    pageTitleSuffix: " | Wiki DnD",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "null",
    },
    locale: "es-ES",
    baseUrl: "www.esdldwiki.online",
    ignorePatterns: ["private", "templates", ".obsidian", ".git", ".ttxfolder", "*.bat", "*.ini", "desktop.ini", "Wiki Índice.md"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Cinzel",
        body: "Crimson Text",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#f5e6c8",       // pergamino
          lightgray: "#e0ccab",   // pergamino oscuro (bordes, sidebar)
          gray: "#9c7e5a",        // marrón medio
          darkgray: "#4a3728",    // marrón oscuro (cuerpo de texto)
          dark: "#2c1a0e",        // casi negro caoba (headings)
          secondary: "#8b1a1a",   // rojo D&D (links)
          tertiary: "#c4862a",    // dorado ámbar (hover)
          highlight: "rgba(139, 26, 26, 0.08)",
          textHighlight: "#f5c84288",
        },
        darkMode: {
          light: "#1a1a2e",       // azul noche profundo
          lightgray: "#2d2d44",   // azul noche medio (bordes, sidebar)
          gray: "#6b6b9a",        // gris-morado apagado
          darkgray: "#c8c8d8",    // plata clara (cuerpo de texto)
          dark: "#eeeef5",        // casi blanco frío (headings)
          secondary: "#c9a84c",   // dorado (links)
          tertiary: "#e8c06a",    // dorado brillante (hover)
          highlight: "rgba(201, 168, 76, 0.12)",
          textHighlight: "#c9a84c44",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.LeafletMaps(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
