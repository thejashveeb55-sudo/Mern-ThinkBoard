const EMBEDDING_SERVICE_URL =
  process.env.EMBEDDING_SERVICE_URL || "http://localhost:5001";

/**
 * Calls the Python Flask microservice to get a 384-dim embedding for a piece of text.
 * Throws if the service is unreachable or returns an error — caller is responsible
 * for catching this (we deliberately don't swallow errors here).
 */
export async function getEmbedding(text) {
  const response = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      `Embedding service returned ${response.status}: ${
        errorBody.error || "unknown error"
      }`
    );
  }

  const data = await response.json();
  return data.embedding; // array of 384 floats
}