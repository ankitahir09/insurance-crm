import { NextResponse } from 'next/server';
import { seedDatabaseAction } from '@/app/actions/seed';

export const dynamic = 'force-dynamic';

// public endpoint to seed the database (GET /api/seed)
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const result = await seedDatabaseAction();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || String(error)
    }, { status: 500 });
  }
}
