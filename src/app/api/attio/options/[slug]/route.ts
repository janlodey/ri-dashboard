import { NextRequest, NextResponse } from 'next/server';

const ATTIO_API = 'https://api.attio.com/v2';
const objectId = process.env.ATTIO_PERSON_OBJECT_ID!;
const ATTIO_API_KEY = process.env.ATTIO_API_KEY!;

export async function GET(req: NextRequest, context: { params: { slug: string } }) {
  const slug = context.params.slug;

  const url = `${ATTIO_API}/objects/${objectId}/attributes/${slug}/options`;

  console.log(`[API Route] URL: ${url}`);
  console.log(`[API Route] API Key: ${ATTIO_API_KEY}`);

  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${ATTIO_API_KEY}`,
    },
  });

  const rawResponse = await res.text();
  console.log(`[API Route] Raw response:`, rawResponse);

  if (!res.ok) {
    console.error(`[API Route] Fetch Error: ${res.statusText}`);
    return NextResponse.json({ error: res.statusText }, { status: res.status });
  }

  const data = JSON.parse(rawResponse);
  const options = data.data
    .filter((opt: any) => !opt.is_archived)
    .map((opt: any) => ({ id: opt.id.option_id, title: opt.title }));

  return NextResponse.json({ options });
}