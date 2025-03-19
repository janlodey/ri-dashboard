// lib/attio.ts

const ATTIO_API = 'https://api.attio.com/v2';
const RECORD_OBJECT_ID = '384e31c6-a74f-4bb8-af8b-62d72c5ae15f'; // Hardcoded Attio object ID for Person records

const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.ATTIO_API_KEY}`,
};

// Use a generic type for attribute objects.
export type Attributes = { [key: string]: any };

/**
 * Retrieve a Person record by email.
 * Uses the POST query endpoint with a filter on the "email_addresses" attribute.
 * (Pass the email as a string.)
 */
export const getPersonByEmail = async (email: string): Promise<any> => {
  const url = `${ATTIO_API}/objects/${RECORD_OBJECT_ID}/records/query`;

  const payload = {
    filter: {
      email_addresses: {
        contains: email
      }
    },
    limit: 1
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error('[Attio GET] HTTP error:', res.statusText);
    return { data: [] };
  }

  const data = await res.json();
  return data;
};

/**
 * Update or create a Person record.
 * For updates, uses PATCH; for creates, uses POST.
 * The payload wraps attribute values inside data.values.
 */
export const updateOrCreatePerson = async (
  recordId: string | null,
  attributes: Attributes
): Promise<any> => {
  let url: string;
  let method: 'POST' | 'PATCH';
  let payload: unknown;

  if (recordId) {
    method = 'PATCH';
    url = `${ATTIO_API}/objects/${encodeURIComponent(RECORD_OBJECT_ID)}/records/${recordId}`;
    payload = { data: { values: attributes } };
  } else {
    method = 'POST';
    url = `${ATTIO_API}/objects/${encodeURIComponent(RECORD_OBJECT_ID)}/records`;
    payload = { object_id: RECORD_OBJECT_ID, data: { values: attributes } };
  }

  console.log('[Attio] Update/Create URL:', url);
  console.log('[Attio] Payload:', payload);

  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  console.log('[Attio] Update/Create raw text:', rawText);

  let responseData;
  try {
    responseData = JSON.parse(rawText);
  } catch (error) {
    console.error('[Attio] JSON parse error (updateOrCreatePerson):', error);
    responseData = {};
  }

  console.log('[Attio] Update/Create Response:', responseData);
  return responseData;
};

/**
 * Retrieve dynamic select options for a given attribute using its slug.
 * Uses the endpoint: GET /objects/{RECORD_OBJECT_ID}/attributes/{attributeSlug}/options
 */
export interface SelectOption {
  id: string;
  title: string;
}

export const getSelectOptions = async (attributeSlug: string): Promise<SelectOption[]> => {
  const url = `${ATTIO_API}/objects/${RECORD_OBJECT_ID}/attributes/${attributeSlug}/options`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ATTIO_API_KEY}`, // Explicitly set auth here
    },
  });

  const rawText = await res.text();
  console.log(`[Attio] Raw response for ${attributeSlug}:`, rawText);

  if (!res.ok) {
    console.error(`[Attio] Failed to fetch options for "${attributeSlug}": ${res.statusText}`);
    return [];
  }

  const data = JSON.parse(rawText);
  return data.data
    .filter((opt: any) => !opt.is_archived)
    .map((opt: any) => ({
      id: opt.id.option_id,
      title: opt.title,
    }));
};