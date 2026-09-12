/**
 * Cloudflare Pages Function — proxies the live Google Apps Script dashboard
 * so it's reachable at a friendly URL (e.g. https://tse-report.pages.dev/)
 * instead of the long script.google.com link.
 *
 * How it works: on every request to "/", this fetches the Apps Script Web
 * App URL server-side and returns its HTML as-is. The Apps Script side
 * always re-reads the Google Sheet fresh on every call, so this stays live.
 *
 * Setup:
 * 1. Replace APPS_SCRIPT_URL below with your own deployment's /exec URL.
 * 2. The Apps Script deployment must have "Who has access: Anyone" (no
 *    Google login required) — otherwise this proxy fetch just gets
 *    Google's sign-in page instead of the dashboard.
 * 3. Commit this file at `functions/index.js` in your GitHub repo, connect
 *    the repo to a Cloudflare Pages project, and deploy. No build step,
 *    no static files needed — this function handles every request.
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyh-JNVlFIdrcePf55nONn78gQBXMCocoXOpQL4_yGb9jtPJ2CbSbRr4Uk_MwWJ4vG1/exec';

export async function onRequestGet(context) {
  try {
    const upstream = await fetch(APPS_SCRIPT_URL, { redirect: 'follow' });
    const html = await upstream.text();

    return new Response(html, {
      status: upstream.status,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        // Cache briefly at Cloudflare's edge so many people opening the
        // link at once don't all separately trigger a fresh Apps Script
        // execution. Data can lag behind a Sheet edit by up to this many
        // seconds — lower it (or remove the header) for stricter freshness.
        'cache-control': 'public, max-age=60',
      },
    });
  } catch (err) {
    return new Response(
      '<div style="font-family:Arial,sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#1B2126;">' +
      '<h2>Could not load the dashboard</h2>' +
      '<p>The proxy could not reach the Apps Script backend. Try again shortly, ' +
      'or open the Apps Script URL directly.</p>' +
      '<p style="color:#8A939B;font-size:13px;">' + String(err) + '</p>' +
      '</div>',
      { status: 502, headers: { 'content-type': 'text/html; charset=UTF-8' } }
    );
  }
}
