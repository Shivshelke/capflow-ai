import os
import subprocess

# 1. Install Node.js 18 if not present (Remotion needs newer Node than apt provides)
node_dir = os.path.abspath("node-v18.18.2-linux-x64")
if not os.path.exists(node_dir):
    print("Installing Node.js...")
    subprocess.run(
        "curl -fsSL https://nodejs.org/dist/v18.18.2/node-v18.18.2-linux-x64.tar.xz | tar -xJ",
        shell=True,
        check=True
    )

# Add node to PATH for this process
os.environ["PATH"] = f"{node_dir}/bin:" + os.environ.get("PATH", "")
os.environ["NODE"] = f"{node_dir}/bin/node"

# 2. Setup the FastAPI + Gradio App
import gradio as gr
from server import app as fastapi_app

# Create a simple Gradio UI just to satisfy Hugging Face's SDK requirement
demo = gr.Blocks()
with demo:
    gr.Markdown("# CapFlow AI Backend Server 🚀\n\nThe AI Engine is running perfectly. Your Netlify frontend can now connect to this server.")

# Mount the Gradio app onto our FastAPI app.
# Our FastAPI routes (like /, /api/transcribe, etc.) will continue to work normally!
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")
