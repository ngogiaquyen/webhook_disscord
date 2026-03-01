// app/api/roblox-user/[userId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!/^\d+$/.test(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
      headers: {
        'Accept': 'application/json',
      },
      // Không cần cache nếu muốn fresh data mỗi lần
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from Roblox' },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log(data)
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}