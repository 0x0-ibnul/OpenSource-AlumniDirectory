import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// 1. Force Next.js to skip pre-rendering this route during build time
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const batch = searchParams.get('batch');
    const country = searchParams.get('country');
    const organization = searchParams.get('organization');
    const search = searchParams.get('search')?.toLowerCase();

    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 2. Check if Environment Variables exist
    if (!serviceAccountKey || !spreadsheetId) {
      return NextResponse.json(
        { error: 'Server configuration missing' },
        { status: 500 }
      );
    }

    // 3. Safe JSON parsing of the key
    let credentials: any;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid Service Account Key format' },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Summary!A2:G',
    });

    let rows = response.data.values || [];

    // 4. Map rows to objects
    let data = rows.map((row: any) => ({
      batch: row[0],
      name: row[1],
      country: row[2],
      city: row[3],
      state: row[4],
      organization: row[5],
      linkedin: row[6],
    }));

    // 5. Apply filters
    if (batch) {
      data = data.filter((item: any) => item.batch === batch);
    }
    if (country) {
      data = data.filter((item: any) => item.country === country);
    }
    if (organization) {
      data = data.filter((item: any) => item.organization === organization);
    }
    if (search) {
      data = data.filter((item: any) => 
        item.name?.toLowerCase().includes(search) || 
        item.organization?.toLowerCase().includes(search)
      );
    }

    // 6. Pagination
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedData = data.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });

  } catch (error: any) {
    console.error('Error fetching alumni data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alumni data', details: error.message },
      { status: 500 }
    );
  }
}
