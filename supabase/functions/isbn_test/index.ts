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
  const rawIsbn = String(body?.isbn ?? "").trim()
  const isbn = rawIsbn.replace(/[^0-9Xx]/g, "")

  if (!isbn) {
    return new Response(JSON.stringify({ error: "ISBN vacío" }), { status: 400, headers })
  }

  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`
    const res = await fetch(url, {
      headers: { "User-Agent": "Desiderio ISBN Test (librosbosch@gmail.com)" },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Open Library ${res.status}` }), { status: 502, headers })
    }

    const json = await res.json()
    const book = json[`ISBN:${isbn}`]

    if (!book) {
      return new Response(JSON.stringify({ found: false, isbn }), { status: 404, headers })
    }

    return new Response(JSON.stringify({
      found: true,
      fuente: "openlibrary",
      isbn,
      titulo: book.title ?? "",
      autor: Array.isArray(book.authors) ? book.authors.map(a => a.name).join("; ") : "",
      editorial: Array.isArray(book.publishers) ? book.publishers.map(p => p.name).join("; ") : "",
      lugar: Array.isArray(book.publish_places) ? book.publish_places.map(p => p.name).join("; ") : "",
      fecha: book.publish_date ?? "",
      paginas: book.number_of_pages ?? null
    }), { headers })
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Fallo consultando Open Library",
      detalle: err instanceof Error ? err.message : "Error desconocido"
    }), { status: 502, headers })
  }
})