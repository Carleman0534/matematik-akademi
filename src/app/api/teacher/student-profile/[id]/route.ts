import { NextRequest, NextResponse } from 'next/server';
import { getStudentProfileHubData } from '@/lib/studentProfile';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const data = await getStudentProfileHubData(studentId);
    return NextResponse.json({
      success: true,
      ...data
    });
  } catch (error: any) {
    console.error('Error in student-profile route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
