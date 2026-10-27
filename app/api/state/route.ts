import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getStateIdentity() {
  const store = await cookies();
  let id = store.get("aerodeck_state")?.value;
  if (!id) id = crypto.randomUUID();
  return { id, store };
}

export async function GET() {
  try {
    const { id, store } = await getStateIdentity();
    const record = await prisma.aeroDeckState.upsert({
      where: { id },
      update: {},
      create: { id },
    });
    const response = NextResponse.json(record);
    if (!store.get("aerodeck_state")) {
      response.cookies.set("aerodeck_state", id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 31536000,
      });
    }
    return response;
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id, store } = await getStateIdentity();
    const body = await request.json();
    const record = await prisma.aeroDeckState.upsert({
      where: { id },
      update: {
        profileJson: JSON.stringify(body.profile ?? {}),
        flightsJson: JSON.stringify(body.flights ?? []),
        favoritesJson: JSON.stringify(body.favorites ?? []),
        notesJson: JSON.stringify(body.notes ?? {}),
        trainingJson: JSON.stringify(body.training ?? []),
      },
      create: {
        id,
        profileJson: JSON.stringify(body.profile ?? {}),
        flightsJson: JSON.stringify(body.flights ?? []),
        favoritesJson: JSON.stringify(body.favorites ?? []),
        notesJson: JSON.stringify(body.notes ?? {}),
        trainingJson: JSON.stringify(body.training ?? []),
      },
    });
    const response = NextResponse.json({ ok: true, updatedAt: record.updatedAt });
    if (!store.get("aerodeck_state")) {
      response.cookies.set("aerodeck_state", id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 31536000,
      });
    }
    return response;
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
