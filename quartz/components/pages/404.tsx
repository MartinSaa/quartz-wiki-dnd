import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const NotFound: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
  const baseDir = url.pathname

  return (
    <article class="popover-hint not-found-page">
      <div class="not-found-scroll">
        <div class="not-found-scroll-inner">
          <h1 class="not-found-title">Archivo sellado</h1>
          <p class="not-found-flavor">
            Este fragmento de la historia aún no ha sido revelado.
          </p>
          <p class="not-found-sub">
            Quizá ese nombre, ese lugar o ese secreto todavía no ha encontrado su momento.
          </p>
          <p class="not-found-sub">
            Regresad cuando el camino os conduzca hasta él.
          </p>
          <img class="not-found-img" src={`${baseDir}Assets/404_wiki.png`} alt="Archivo sellado" />
        </div>
      </div>

      <div class="not-found-buttons">
        <a class="not-found-btn" href={baseDir}>↩ Volver al índice</a>
        <a class="not-found-btn" href="#" onclick="event.preventDefault(); history.back()">← Nota anterior</a>
      </div>
    </article>
  )
}

export default (() => NotFound) satisfies QuartzComponentConstructor
