// Remote Kill-Switch — Block 29 Task 3
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get('x-kill-token');
  if (token !== process.env.KILL_SWITCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('vault_status')
    .update({ is_killed: true })
    .eq('id', 1);

  if (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'killed' });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get('x-kill-token');
  if (token !== process.env.KILL_SWITCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('vault_status')
    .update({ is_killed: false })
    .eq('id', 1);

  if (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'restored' });
}
