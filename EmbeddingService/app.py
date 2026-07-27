from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)

# Loaded ONCE at startup, not per-request — loading the model is the slow part.
# Reusing this across requests is why we run this as a long-lived service
# instead of a script you re-run each time.
model = SentenceTransformer("all-MiniLM-L6-v2")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/embed", methods=["POST"])
def embed():
    data = request.get_json(silent=True)

    if not data or "text" not in data:
        return jsonify({"error": "Request body must include a 'text' field"}), 400

    text = data["text"]

    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "'text' must be a non-empty string"}), 400

    # .encode() returns a numpy array; convert to a plain list so it's JSON-serializable
    vector = model.encode(text).tolist()

    return jsonify({
        "embedding": vector,
        "dimensions": len(vector),
        "model": "all-MiniLM-L6-v2",
    }), 200


if __name__ == "__main__":
    # Port 5001, since your Node backend likely already uses 5000/3000
    app.run(host="0.0.0.0", port=5001, debug=True)