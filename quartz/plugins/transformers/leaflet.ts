import { QuartzTransformerPlugin } from "../types"
import { Root, Code, Html } from "mdast"
import { visit, SKIP } from "unist-util-visit"
import fs from "fs"
import path from "path"
// @ts-ignore
import leafletScript from "../../components/scripts/leaflet.inline"

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeafletMarker {
  id: string
  type: string
  loc: [number, number]
  link?: string
  layer: string
  description?: string | null
}

interface LeafletMapEntry {
  id: string
  markers: LeafletMarker[]
}

interface MarkerTypeConfig {
  type: string
  color: string
  iconName: string
}

interface LeafletData {
  mapMarkers: LeafletMapEntry[]
  defaultMarker?: MarkerTypeConfig
  markerIcons?: MarkerTypeConfig[]
}

interface LeafletBlockParams {
  id?: string
  image?: string
  bounds?: [[number, number], [number, number]]
  height?: string
  defaultZoom?: number
  minZoom?: number
  maxZoom?: number
  zoomDelta?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Replace spaces with hyphens (Quartz's slugification for file paths) */
function slugSegment(s: string): string {
  return s.replace(/ /g, "-")
}

/**
 * Parse the leaflet fenced code block (YAML-like, with ### comments).
 * Handles multi-line lists for `image:`.
 */
function parseLeafletBlock(content: string): LeafletBlockParams {
  const result: Record<string, unknown> = {}
  let inImageList = false

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("###") || trimmed === "") continue

    // List item under `image:` or `markerTag:`
    if (trimmed.startsWith("- ")) {
      if (inImageList) {
        const match = trimmed.slice(2).trim().match(/\[\[(.+?)\]\]/)
        if (match) result["image"] = match[1]
      }
      continue
    }

    inImageList = false
    const colonIdx = line.indexOf(":")
    if (colonIdx === -1) continue

    const key = line.slice(0, colonIdx).trim()
    const rawVal = line.slice(colonIdx + 1).trim()

    if (key === "image" && rawVal === "") {
      inImageList = true
      continue
    }
    if (rawVal === "") continue

    if (key === "image") {
      const match = rawVal.match(/\[\[(.+?)\]\]/)
      if (match) result["image"] = match[1]
    } else if (key === "bounds" && rawVal.startsWith("[[")) {
      try { result[key] = JSON.parse(rawVal) } catch { /* skip malformed */ }
    } else if (rawVal === "true") {
      result[key] = true
    } else if (rawVal === "false") {
      result[key] = false
    } else if (!isNaN(Number(rawVal))) {
      result[key] = Number(rawVal)
    } else {
      result[key] = rawVal
    }
  }

  return result as LeafletBlockParams
}

/**
 * Decode the URL-encoded [[image.png]] layer string and return the image filename.
 * Example: "%5B%5BRiverafronda.png%5D%5D" → "Riverafronda.png"
 */
function decodeLayer(layer: string): string {
  const decoded = decodeURIComponent(layer)
  const match = decoded.match(/\[\[(.+?)\]\]/)
  return match ? match[1] : decoded
}

/**
 * Convert an Obsidian note link (from data.json) to a Quartz URL.
 *
 * Full path:   "El silencio de los dioses/Localizaciones/Foo.md#Bar Baz"
 *              → "/El-silencio-de-los-dioses/Localizaciones/Foo#Bar-Baz"
 *
 * Short name:  "Ithal-Dur"  → looked up in noteSlugMap, e.g. "/El-silencio-de-los-dioses/Localizaciones/Ithal-Dur"
 */
function linkToUrl(link: string, noteSlugMap: Map<string, string>): string {
  // Separate anchor
  const hashIdx = link.indexOf("#")
  let notePart = hashIdx >= 0 ? link.slice(0, hashIdx) : link
  const anchorPart = hashIdx >= 0 ? link.slice(hashIdx) : ""
  const sluggedAnchor = anchorPart ? "#" + slugSegment(anchorPart.slice(1)) : ""

  // Remove .md extension
  notePart = notePart.replace(/\.md$/, "")

  if (notePart.includes("/")) {
    // Full path — slugify each segment
    const slugged = notePart.split("/").map(slugSegment).join("/")
    return "/" + slugged + sluggedAnchor
  } else {
    // Short name — look up in manifest
    const key = slugSegment(notePart)
    const found = noteSlugMap.get(key.toLowerCase())
    if (found) return found + sluggedAnchor
    // Fallback: just use the slugged name (Quartz SPA may resolve it)
    return "/" + key + sluggedAnchor
  }
}

/**
 * Recursively scan the vault Assets folder and build a map:
 *   lowercase_filename → absolute web URL (/Assets/...)
 */
function buildImageManifest(assetsDir: string): Map<string, string> {
  const manifest = new Map<string, string>()
  if (!fs.existsSync(assetsDir)) return manifest

  function scan(dir: string, urlPrefix: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const sluggedName = slugSegment(entry.name)
      if (entry.isDirectory()) {
        scan(path.join(dir, entry.name), urlPrefix + "/" + sluggedName)
      } else if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(entry.name)) {
        manifest.set(entry.name.toLowerCase(), urlPrefix + "/" + sluggedName)
      }
    }
  }

  scan(assetsDir, "/Assets")
  return manifest
}

/**
 * Scan all markdown files in the vault and build a map:
 *   slugged_basename_lowercase → full Quartz URL slug
 *
 * Used to resolve short wikilinks like "Ithal-Dur" → "/El-silencio-de-los-dioses/Localizaciones/Ithal-Dur"
 */
function buildNoteSlugMap(contentDir: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!fs.existsSync(contentDir)) return map

  function scan(dir: string, relPath: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue
      if (entry.isDirectory()) {
        const sluggedName = slugSegment(entry.name)
        scan(path.join(dir, entry.name), relPath + "/" + sluggedName)
      } else if (entry.name.endsWith(".md")) {
        const basename = entry.name.slice(0, -3) // remove .md
        const sluggedBase = slugSegment(basename)
        const fullSlug = relPath + "/" + sluggedBase
        map.set(sluggedBase.toLowerCase(), fullSlug)
      }
    }
  }

  scan(contentDir, "")
  return map
}

// ─── HTML generation ─────────────────────────────────────────────────────────

let mapCounter = 0

function generateLeafletHtml(
  params: LeafletBlockParams,
  markers: LeafletMarker[],
  imageUrl: string,
  noteSlugMap: Map<string, string>,
  markerTypesJson: string,
): string {
  const mapId = `leaflet-map-${++mapCounter}`
  const bounds = params.bounds!
  const height = params.height ?? "600px"
  const defaultZoom = params.defaultZoom ?? -2
  const minZoom = params.minZoom ?? -5
  const maxZoom = params.maxZoom ?? 3
  const zoomDelta = params.zoomDelta ?? 0.5

  // Serialize markers as a JS-safe JSON blob
  const markersJson = JSON.stringify(
    markers.map((m) => ({
      loc: m.loc,
      link: m.link ? linkToUrl(m.link, noteSlugMap) : null,
      label: m.description ?? null,
      type: m.type ?? "default",
    })),
  )

  // Use a data attribute to pass config — avoids issues with script injection order
  return `<div
  id="${mapId}"
  class="leaflet-map-container"
  style="height:${height};width:100%;border-radius:8px;margin:1rem 0;"
  data-image="${imageUrl}"
  data-bounds="${JSON.stringify(bounds).replace(/"/g, "&quot;")}"
  data-default-zoom="${defaultZoom}"
  data-min-zoom="${minZoom}"
  data-max-zoom="${maxZoom}"
  data-zoom-delta="${zoomDelta}"
  data-markers="${markersJson.replace(/"/g, "&quot;")}"
  data-marker-types="${markerTypesJson.replace(/"/g, "&quot;")}"
></div>`
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

export const LeafletMaps: QuartzTransformerPlugin = () => {
  return {
    name: "LeafletMaps",

    markdownPlugins(ctx) {
      const contentDir = ctx.argv.directory

      // Load data.json from the Obsidian leaflet plugin
      let leafletData: LeafletData = { mapMarkers: [] }
      const dataJsonPath = path.join(
        contentDir,
        ".obsidian",
        "plugins",
        "obsidian-leaflet-plugin",
        "data.json",
      )
      try {
        leafletData = JSON.parse(fs.readFileSync(dataJsonPath, "utf-8")) as LeafletData
      } catch {
        console.warn("[LeafletMaps] Could not read obsidian-leaflet data.json:", dataJsonPath)
      }

      // Build lookup manifests
      const imageManifest = buildImageManifest(path.join(contentDir, "Assets"))
      const noteSlugMap = buildNoteSlugMap(contentDir)

      // Build marker type config from data.json
      const defaultMarkerConfig: MarkerTypeConfig = leafletData.defaultMarker ?? {
        type: "default",
        color: "#3388ff",
        iconName: "map-marker-alt",
      }
      const markerTypes: MarkerTypeConfig[] = [
        defaultMarkerConfig,
        ...(leafletData.markerIcons ?? []),
      ]
      const markerTypesJson = JSON.stringify(markerTypes)

      return [
        () => (tree: Root) => {
          visit(tree, "code", (node: Code, index, parent) => {
            if (node.lang !== "leaflet" || !parent || index === undefined) return

            const params = parseLeafletBlock(node.value)
            if (!params.id || !params.image || !params.bounds) return

            // Find markers for this map+image (filter by layer for shared IDs)
            const mapEntry = leafletData.mapMarkers.find((m) => m.id === params.id)
            const imageName = params.image
            const markers: LeafletMarker[] = mapEntry
              ? mapEntry.markers.filter(
                  (m) => decodeLayer(m.layer).toLowerCase() === imageName.toLowerCase(),
                )
              : []

            // Resolve image URL
            const imageUrl =
              imageManifest.get(imageName.toLowerCase()) ??
              "/Assets/" + slugSegment(imageName)

            const html = generateLeafletHtml(params, markers, imageUrl, noteSlugMap, markerTypesJson)
            const htmlNode: Html = { type: "html", value: html }
            parent.children.splice(index, 1, htmlNode)
            return [SKIP, index]
          })
        },
      ]
    },

    externalResources() {
      return {
        css: [{ content: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }],
        js: [
          {
            src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
            loadTime: "beforeDOMReady",
            contentType: "external",
          },
          {
            script: leafletScript,
            loadTime: "afterDOMReady",
            contentType: "inline",
          },
        ],
      }
    },
  }
}
