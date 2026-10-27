import { NextResponse } from "next/server";

export async function GET() {
  const configured = Boolean(process.env.DATABASE_URL);
  return NextResponse.json({ configured, provider: configured ? "PostgreSQL/Neon" : null }, { status: 200 });
}
