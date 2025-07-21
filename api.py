import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from agent.agent import initialize_knowledge_base, rag_update_daemon, chat_with_trendpup

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentRequest(BaseModel):
    input: str

@app.on_event("startup")
async def startup_event():
    await initialize_knowledge_base()
    app.state.rag_task = asyncio.create_task(rag_update_daemon())

@app.on_event("shutdown")
async def shutdown_event():
    rag_task = getattr(app.state, 'rag_task', None)
    if rag_task:
        rag_task.cancel()
        try:
            await rag_task
        except asyncio.CancelledError:
            pass

@app.post("/api/agent")
async def agent_endpoint(request: AgentRequest):
    try:
        response = await chat_with_trendpup(request.input)
        return {"response": response}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
