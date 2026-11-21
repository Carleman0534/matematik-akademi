import { NextRequest, NextResponse } from 'next/server';
import { verifyAndExplainWithAi, type AiVerificationRequest } from '@/lib/ai/externalAiChecker';

export async function POST(req: NextRequest) {
  try {
    const body: AiVerificationRequest = await req.json();

    if (!body.questionText || !body.options) {
      return NextResponse.json({ success: false, error: 'Soru metni ve seçenekler gereklidir' }, { status: 400 });
    }

    const result = await verifyAndExplainWithAi(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error verifying answer with AI:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
