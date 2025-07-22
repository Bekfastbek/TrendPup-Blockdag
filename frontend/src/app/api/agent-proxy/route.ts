import { NextRequest, NextResponse } from 'next/server';

// Proxy POST requests to the backend FastAPI server
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = body.input;
    if (!input) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }
    // Forward to FastAPI backend
    const apiRes = await fetch('http://localhost:8000/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const data = await apiRes.json();
    return NextResponse.json(data, { status: apiRes.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error', stack: error.stack }, { status: 500 });
  }
}
