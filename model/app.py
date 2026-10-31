import asyncio
import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
import uvicorn
from langchain.chat_models import init_chat_model
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_ollama import OllamaEmbeddings
from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

# Load settings beside this file so startup works from the repository root or model folder.
load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

MODEL_NAME = os.getenv("MODEL_NAME", "qwen3.5:0.8b")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "qwen3-embedding:0.6b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_TIMEOUT_SECONDS = int(os.getenv("MODEL_TIMEOUT_SECONDS", "180"))
if MODEL_TIMEOUT_SECONDS <= 0:
    raise ValueError("MODEL_TIMEOUT_SECONDS must be a positive integer.")
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200
INSTRUCTIONS_PATH = Path(__file__).with_name("instructions.md")
APP_ENV = os.getenv("APP_ENV", "dev").lower()

logging.basicConfig(
    level=logging.INFO if APP_ENV != "prod" else logging.WARNING,
    format="%(asctime)s %(levelname)s [MODEL] %(message)s",
)
logger = logging.getLogger(__name__)

try:
    MODEL_INSTRUCTIONS = INSTRUCTIONS_PATH.read_text(encoding="utf-8").strip()
except OSError:
    MODEL_INSTRUCTIONS = "Answer using only the retrieved context. Say when the context is insufficient."
    logger.warning("Model instructions file could not be loaded: %s", INSTRUCTIONS_PATH)

embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL_NAME, base_url=OLLAMA_BASE_URL)
vector_store = InMemoryVectorStore(embeddings)
llm = init_chat_model(f"ollama:{MODEL_NAME}", base_url=OLLAMA_BASE_URL)


def split_text(text: str) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(text):
            break
        start = end - CHUNK_OVERLAP
    return chunks


async def health(_: Request) -> JSONResponse:
    logger.info("Health check succeeded")
    return JSONResponse({"status": "ok", "model": MODEL_NAME})


async def ingest(request: Request) -> JSONResponse:
    try:
        try:
            body = await request.json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning("Ingestion rejected: request body was not valid JSON")
            return JSONResponse({"error": "Request body must be valid JSON."}, status_code=400)
        if not isinstance(body, dict):
            logger.warning("Ingestion rejected: request body was not an object")
            return JSONResponse({"error": "Request body must be a JSON object."}, status_code=400)

        content = body.get("content")
        if not isinstance(content, str) or not content.strip():
            logger.warning("Ingestion rejected: content was empty or invalid")
            return JSONResponse({"error": "content must be a non-empty string."}, status_code=400)

        repository = body.get("repositoryFullName", "unknown")
        file_path = body.get("filePath", "unknown")
        chunks = split_text(content)
        documents = [
            Document(page_content=chunk, metadata={"repositoryFullName": repository, "filePath": file_path, "chunkIndex": index})
            for index, chunk in enumerate(chunks)
        ]
        await asyncio.wait_for(
            asyncio.to_thread(vector_store.add_documents, documents),
            timeout=MODEL_TIMEOUT_SECONDS,
        )
        logger.info("Ingestion succeeded: repository=%s file=%s chunks=%d", repository, file_path, len(documents))
        return JSONResponse({"status": "ingested", "chunks": len(documents), "filePath": file_path})
    except asyncio.TimeoutError:
        logger.error("Ingestion failed: embedding timed out")
        return JSONResponse({"error": "The embedding operation exceeded the configured time limit."}, status_code=504)
    except Exception as error:
        logger.exception("Ingestion failed")
        message = str(error) if APP_ENV != "prod" else "The model service could not ingest the file."
        return JSONResponse({"error": message}, status_code=500)


async def chat(request: Request) -> JSONResponse:
    try:
        try:
            body = await request.json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning("Chat request rejected: request body was not valid JSON")
            return JSONResponse({"error": "Request body must be valid JSON."}, status_code=400)
        if not isinstance(body, dict):
            logger.warning("Chat request rejected: request body was not an object")
            return JSONResponse({"error": "Request body must be a JSON object."}, status_code=400)

        query = body.get("query")
        if not isinstance(query, str) or not query.strip():
            logger.warning("Chat request rejected: query was empty or invalid")
            return JSONResponse({"error": "query must be a non-empty string."}, status_code=400)

        documents = await asyncio.wait_for(
            asyncio.to_thread(vector_store.similarity_search, query, k=4),
            timeout=MODEL_TIMEOUT_SECONDS,
        )
        context = "\n\n".join(document.page_content for document in documents)
        messages = [
            {"role": "system", "content": MODEL_INSTRUCTIONS + "\n\nRetrieved context:\n" + (context or "No context has been retrieved yet.")},
            {"role": "user", "content": query},
        ]
        response = await asyncio.wait_for(asyncio.to_thread(llm.invoke, messages), timeout=MODEL_TIMEOUT_SECONDS)
        logger.info("Chat request succeeded: sources=%d", len(documents))
        return JSONResponse({"answer": response.content, "sources": [document.metadata for document in documents]})
    except asyncio.TimeoutError:
        logger.error("Chat request failed: model timed out")
        return JSONResponse(
            {"error": f"The local model exceeded the {MODEL_TIMEOUT_SECONDS}-second processing limit."},
            status_code=504,
        )
    except Exception as error:
        logger.exception("Chat request failed")
        message = str(error) if APP_ENV != "prod" else "The model service could not complete the chat request."
        return JSONResponse({"error": message}, status_code=500)


app = Starlette(routes=[
    Route("/health", health, methods=["GET"]),
    Route("/ingest", ingest, methods=["POST"]),
    Route("/chat", chat, methods=["POST"]),
])
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("UI_ORIGIN", "http://localhost:5173")],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("MODEL_HOST", "127.0.0.1"), port=int(os.getenv("MODEL_PORT", "8000")))
