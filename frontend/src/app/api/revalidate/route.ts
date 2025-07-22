import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Revalidate both the tag and the path
    revalidateTag('token-data');
    revalidatePath('/api/token-data');
    
    console.log('Cache invalidated at:', new Date().toISOString());
    
    return NextResponse.json({ 
      message: 'Cache invalidated successfully',
      revalidated: true,
      now: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
  } catch (err) {
    console.error('Error revalidating cache:', err);
    return NextResponse.json({ 
      message: 'Error revalidating cache',
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}