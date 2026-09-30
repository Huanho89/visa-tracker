import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      visitor_id,
      session_id,
      url,
      title,
      referrer,
      device,
      browser,
      os,
      country,
      city,
      utm_source,
      utm_medium,
      utm_campaign
    } = body;

    // Use service role key to insert logs because it bypasses RLS safely and fast.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Format referrer slightly to clean it up (e.g. group search and social engines)
    let cleanReferrer = referrer;
    if (referrer && referrer.includes('google.com')) {
      cleanReferrer = 'Google Search';
    } else if (referrer && (referrer.includes('facebook.com') || referrer.includes('fb.me'))) {
      cleanReferrer = 'Facebook';
    } else if (referrer && (referrer.includes('t.co') || referrer.includes('twitter.com') || referrer.includes('x.com'))) {
      cleanReferrer = 'Twitter/X';
    } else if (referrer && referrer.includes('linkedin.com')) {
      cleanReferrer = 'LinkedIn';
    } else if (referrer && referrer.includes('youtube.com')) {
      cleanReferrer = 'YouTube';
    } else if (!referrer || referrer === 'Direct' || referrer === '') {
      cleanReferrer = 'Direct / Bookmarks';
    } else {
      // Keep only hostname for others
      try {
        const urlObj = new URL(referrer);
        cleanReferrer = urlObj.hostname;
      } catch (e) {
        cleanReferrer = referrer;
      }
    }

    const { error } = await supabase
      .from('analytics_logs')
      .insert({
        visitor_id,
        session_id,
        url: url || '/',
        title: title || 'Visa Auto Tracking',
        referrer: cleanReferrer,
        device: device || 'Desktop',
        browser: browser || 'Unknown',
        os: os || 'Unknown',
        country: country || 'Unknown',
        city: city || 'Unknown',
        utm_source,
        utm_medium,
        utm_campaign
      });

    if (error) {
      console.error('Database log error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
