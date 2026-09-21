/**
 * Next.js API Route - Governance Eval Proxy
 *
 * Forwards eval requests from the browser to the AgentClamp backend,
 * injecting the server-side API key (if set) so the browser never sees it.
 *
 * Browser -> POST /api/governance/evaluate -> Backend /api/v1/governance/evaluate
 */
import { NextRequest, NextResponse } from 'next/server'

const GOVERNANCE_API_URL = (process.env.GOVERNANCE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const GOVERNANCE_API_KEY = process.env.GOVERNANCE_API_KEY || ''

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    // Only add the API key header if one is configured
    if (GOVERNANCE_API_KEY) {
      headers['X-API-Key'] = GOVERNANCE_API_KEY
    }

    const upstream = await fetch(`${GOVERNANCE_API_URL}/api/v1/governance/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: data?.detail || `Backend error: ${upstream.status}` },
        { status: upstream.status }
      )
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: `Cannot reach backend at ${GOVERNANCE_API_URL}. Is it running? (${message})`,
      },
      { status: 502 }
    )
  }
}