import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative, FullSlug } from "../util/path"

const SpinoffGrid: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
  // Detect spin-off root pages: slug pattern "Spin offs/<name>/<name>"
  const spinoffs = allFiles
    .filter((f) => {
      if (!f.slug) return false
      const parts = f.slug.split("/")
      // Must be exactly 3 parts, first is "Spin offs", and last two are equal
      return (
        parts.length === 3 &&
        parts[0] === "Spin-offs" &&
        parts[1].toLowerCase() === parts[2].toLowerCase()
      )
    })
    .sort((a, b) => {
      const ta = a.frontmatter?.title ?? ""
      const tb = b.frontmatter?.title ?? ""
      return ta.localeCompare(tb, "es")
    })

  if (spinoffs.length === 0) return null

  return (
    <div class="wiki-spinoffs-section">
      <div class="wiki-spinoffs-header">
        <span class="wiki-spinoffs-divider">⸻ ✦ ⸻</span>
        <span class="wiki-spinoffs-title">Aventuras paralelas</span>
        <span class="wiki-spinoffs-divider">⸻ ✦ ⸻</span>
      </div>
      <div class="wiki-spinoffs-grid">
        {spinoffs.map((spinoff) => {
          const title = spinoff.frontmatter?.title ?? spinoff.slug!.split("/").pop() ?? ""
          const cover = (spinoff.frontmatter as Record<string, unknown>)?.cover as string | undefined
          const href = resolveRelative(fileData.slug!, spinoff.slug! as FullSlug)

          return (
            <a href={href} class="wiki-spinoff-card">
              {cover && (
                <img src={cover} alt={`${title} cartel`} class="wiki-spinoff-img" />
              )}
              <div class="wiki-spinoff-overlay">
                <div class="wiki-spinoff-accent"></div>
                <div class="wiki-spinoff-body">
                  <div class="wiki-spinoff-name">{title}</div>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default (() => SpinoffGrid) satisfies QuartzComponentConstructor
