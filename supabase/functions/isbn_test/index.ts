function normalizeIsbn(raw: string) {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase()
}

function lowerNoAccents(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function normalizeAuthorName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return name.trim()
  if (parts.length === 2) return `${parts[1].toUpperCase()}, ${parts[0]}`

  const compoundGiven = new Set(["maria", "jose"])
  const second = lowerNoAccents(parts[1])

  if (parts.length === 3) {
    if (compoundGiven.has(second)) {
      return `${parts[2].toUpperCase()}, ${parts[0]} ${parts[1]}`
    }
    return `${parts[1].toUpperCase()} ${parts[2].toUpperCase()}, ${parts[0]}`
  }

  const givenCount = compoundGiven.has(second) ? 2 : 1
  const given = parts.slice(0, givenCount).join(" ")
  const surnames = parts.slice(givenCount).join(" ").toUpperCase()
  return `${surnames}, ${given}`
}

function extractYear(value: unknown) {
  const text = String(value ?? "").trim()
  const match = text.match(/\b(1[5-9]\d{2}|20\d{2}|2100)\b/)
  return match ? match[1] : text
}

function buildPieEditorial(lugar: string, editorial: string, fecha: string) {
  const hasLugar = !!lugar
  const hasEditorial = !!editorial
  const hasFecha = !!fecha

  if (hasLugar && hasEditorial && hasFecha) return `${lugar}: ${editorial}, ${fecha}`
  if (hasLugar && hasEditorial) return `${lugar}: ${editorial}`
  if (hasEditorial && hasFecha) return `${editorial}, ${fecha}`
  if (hasLugar && hasFecha) return `${lugar}, ${fecha}`
  if (hasLugar) return lugar
  if (hasEditorial) return editorial
  if (hasFecha) return fecha
  return ""
}

function buildPaginacion(paginas: unknown) {
  const n = Number(paginas)
  return Number.isFinite(n) && n > 0 ? `${n} pp.` : ""
}

Deno.serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Content-Type": "application/json",
  }

  if (req.method === "OPTIONS") return new Response(null, { headers })

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers })
  }

  const body = await req.json().catch(() => ({}))
  const isbn_limpio = normalizeIsbn(String(body?.isbn ?? "").trim())

  if (!isbn_limpio) {
    return new Response(JSON.stringify({ error: "ISBN vacio" }), { status: 400, headers })
  }

  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn_limpio)}&jscmd=data&format=json`
    const res = await fetch(url, {
      headers: { "User-Agent": "Desiderio ISBN Test (librosbosch@gmail.com)" },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Open Library ${res.status}` }), { status: 502, headers })
    }

    const json = await res.json()
    const book = json[`ISBN:${isbn_limpio}`]

    if (!book) {
      return new Response(JSON.stringify({ found: false, isbn_limpio }), { status: 404, headers })
    }

    const autorFuente = Array.isArray(book.authors) ? book.authors.map((a: any) => a.name).join("; ") : ""
    const editorial = Array.isArray(book.publishers) ? book.publishers.map((p: any) => p.name).join("; ") : ""
    const lugar = Array.isArray(book.publish_places) ? book.publish_places.map((p: any) => p.name).join("; ") : ""
    const fecha = extractYear(book.publish_date)
    const paginas = book.number_of_pages ?? null

    return new Response(JSON.stringify({
      found: true,
      fuente: "openlibrary",
      isbn_limpio,
      titulo: book.title ?? "",
      autor: autorFuente ? autorFuente.split("; ").map(normalizeAuthorName).join("; ") : "",
      editorial,
      lugar,
      fecha,
      paginas,
      pie_editorial: buildPieEditorial(lugar, editorial, fecha),
      paginacion: buildPaginacion(paginas)
    }), { headers })
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Fallo consultando Open Library",
      detalle: err instanceof Error ? err.message : "Error desconocido"
    }), { status: 502, headers })
  }
})