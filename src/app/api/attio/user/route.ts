// app/api/attio/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fields from '@/config/fields.json';

const ATTIO_API = 'https://api.attio.com/v2';
const objectId = process.env.ATTIO_OBJECT_SLUG!;
const ATTIO_API_KEY = process.env.ATTIO_API_KEY!;

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');

  const query = {
    filter: { email_addresses: { email_address: email } },
    limit: 1,
  };

  const response = await fetch(`${ATTIO_API}/objects/${objectId}/records/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ATTIO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    console.error('[Attio GET] HTTP error:', response.statusText);
    return NextResponse.json({ data: null });
  }

  const data = await response.json();
  const record = data.data?.[0];

  if (!record) {
    return NextResponse.json({ data: null });
  }

  const attributes: Record<string, any> = {};
  fields.forEach(({ slug, type }) => {
    if (slug === 'email_addresses') {
      attributes[slug] = [email];
    } else if (type === 'select') {
      attributes[slug] = record.values[slug]?.[0]?.option?.id.option_id ?? '';
    } else {
      attributes[slug] = record.values[slug]?.[0]?.value ?? '';
    }
  });

  return NextResponse.json({
    data: {
      recordId: record.id.record_id,
      attributes,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    if (!bodyText) {
      console.error('[Attio POST] Empty request body');
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }
    const { recordId, attributes }: { recordId: string | null; attributes: Attributes } = JSON.parse(bodyText);
    console.log('[Attio POST] Received payload:', { recordId, attributes });

    const response = await updateOrCreatePerson(recordId, attributes);
    console.log('[Attio POST] Response from Attio:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Attio POST] Error:', error);
    return NextResponse.json({ error: 'Failed to update/create user in Attio' }, { status: 500 });
  }
}