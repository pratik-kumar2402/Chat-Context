#!/bin/sh
# Start Ollama server in background
ollama serve &
sleep 5  # give it time to boot

# Pull models
ollama pull qwen3.5:0.8b
ollama pull qwen2.5:0.5b  # replace with a valid embedding model

# Keep Ollama running in foreground
wait
