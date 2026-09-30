'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, Suspense } from 'react';

function TrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    // Generate unique visitor_id and session_id if not present
    let visitorId = localStorage.getItem('vta_visitor_id');
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('vta_visitor_id', visitorId);
    }

    let sessionId = sessionStorage.getItem('vta_session_id');
    if (!sessionId) {
      sessionId = 'ses_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('vta_session_id', sessionId);
    }

    // Check if geo is in sessionStorage to avoid repeating lookups
    let geo = { country: 'Unknown', city: 'Unknown' };
    const savedGeo = sessionStorage.getItem('vta_visitor_geo');
    
    const trackPageview = (geoData: { country: string; city: string }) => {
      const fullUrl = pathname + (searchParams?.toString() ? '?' + searchParams.toString() : '');
      
      // Prevent double tracking in the same render
      if (lastTrackedPath.current === fullUrl) return;
      lastTrackedPath.current = fullUrl;

      // Extract UTM params
      const utmSource = searchParams?.get('utm_source') || null;
      const utmMedium = searchParams?.get('utm_medium') || null;
      const utmCampaign = searchParams?.get('utm_campaign') || null;

      // Simple browser/os/device detection on client side
      const ua = navigator.userAgent;
      let device = 'Desktop';
      if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
        device = /iPad/i.test(ua) ? 'Tablet' : 'Mobile';
      }

      let os = 'Unknown';
      if (/Windows/i.test(ua)) os = 'Windows';
      else if (/Macintosh/i.test(ua) && !/Mobi/i.test(ua)) os = 'macOS';
      else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
      else if (/Android/i.test(ua)) os = 'Android';
      else if (/Linux/i.test(ua)) os = 'Linux';

      let browser = 'Unknown';
      if (/Chrome/i.test(ua) && !/Chromium|Edg|OPR/i.test(ua)) browser = 'Chrome';
      else if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) browser = 'Safari';
      else if (/Firefox/i.test(ua)) browser = 'Firefox';
      else if (/Edg/i.test(ua)) browser = 'Edge';
      else if (/OPR|Opera/i.test(ua)) browser = 'Opera';

      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_id: visitorId,
          session_id: sessionId,
          url: pathname,
          title: document.title || 'Visa Auto Tracking',
          referrer: document.referrer || 'Direct',
          device,
          os,
          browser,
          country: geoData.country,
          city: geoData.city,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign
        })
      }).catch(err => console.error('Failed to log pageview:', err));
    };

    if (savedGeo) {
      try {
        geo = JSON.parse(savedGeo);
        trackPageview(geo);
      } catch (e) {
        sessionStorage.removeItem('vta_visitor_geo');
      }
    } else {
      // Fetch geo info from free api once per session
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          const geoData = {
            country: data.country_name || 'Unknown',
            city: data.city || 'Unknown'
          };
          sessionStorage.setItem('vta_visitor_geo', JSON.stringify(geoData));
          trackPageview(geoData);
        })
        .catch(() => {
          // If blocked/fails, track with Unknown geo
          trackPageview({ country: 'Unknown', city: 'Unknown' });
        });
    }
  }, [pathname, searchParams]);

  return null;
}

export default function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerContent />
    </Suspense>
  );
}
