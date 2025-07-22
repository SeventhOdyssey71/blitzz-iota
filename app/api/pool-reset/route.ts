import { NextResponse } from 'next/server';

export async function POST() {
  // This endpoint can be called from the frontend to trigger a pool reset
  // In production, you'd want to add authentication here
  
  try {
    // Return success - the actual reset happens on the client side
    return NextResponse.json({ 
      success: true, 
      message: 'Pool reset triggered. Clear your browser cache and reload.',
      instructions: [
        'Clear browser localStorage',
        'Run the pool creation command in terminal',
        'Reload the application'
      ]
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset pools' },
      { status: 500 }
    );
  }
}