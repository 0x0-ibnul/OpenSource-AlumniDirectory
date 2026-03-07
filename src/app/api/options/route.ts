import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// 1. Force Next.js to skip pre-rendering this route during build time
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 2. Check if Environment Variables exist
    if (!serviceAccountKey || !spreadsheetId) {
      console.error('Missing Google Service Account Key or Sheet ID in environment variables.');
      return NextResponse.json(
        { error: 'Server configuration missing' },
        { status: 500 }
      );
    }

    // 3. Safe JSON parsing of the key
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (parseError) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON:', parseError.message);
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
      range: 'Summary!A2:G', // Excluding header row
    });

    const rows = response.data.values || [];
    
    // 4. Extract and process unique values
    const batches = [...new Set(rows
      .map(row => parseInt(row[0]))
      .filter(batch => !isNaN(batch)))] 
      .sort((a, b) => a - b); 

    const countries = [...new Set(rows
      .map(row => row[2])
      .filter(country => country && country.trim()))] 
      .sort();

    const organizations = [...new Set(rows
      .map(row => row[5])
      .filter(org => org && org.trim()))] 
      .sort();

    return NextResponse.json({
      batches,
      countries,
      organizations
    });

  } catch (error) {
    console.error('Error fetching dropdown options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dropdown options', details: error.message },
      { status: 500 }
    );
  }
}
