import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "This endpoint is no longer used" },
    { status: 404 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is no longer used" },
    { status: 404 }
  );
}
