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
  const isbn = body?.isbn ?? null

  return new Response(
    JSON.stringify({ titulo: "Libro de prueba", autor: "Autor simulado", isbn }),
    { headers }
  )
})