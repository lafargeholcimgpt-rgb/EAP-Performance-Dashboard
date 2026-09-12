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
    const upstream = await fetch(APPS_SCRIPT_URL, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const html = await upstream.text();

    const looksLikeDashboard = html.includes('id="app"') || html.length > 2000;
    if (!looksLikeDashboard) {
      return new Response(
        '<div style="font-family:Arial,sans-serif;max-width:640px;margin:60px auto;color:#1B2126;">' +
        '<h2>Got an unexpected response from Apps Script</h2>' +
        '<p>HTTP status from Apps Script: <b>' + upstream.status + '</b>, body length: ' + html.length + '</p>' +
        '<p>This usually means the Apps Script deployment still requires a Google login, or the deployment ' +
        'wasn\'t redeployed as a "New version" after changing access to "Anyone". Raw response below:</p>' +
        '<pre style="white-space:pre-wrap;background:#F5F6F7;padding:12px;border-radius:4px;font-size:12px;overflow:auto;">' +
        html.replace(/</g, '&lt;').slice(0, 3000) +
        '</pre></div>',
        { status: 200, headers: { 'content-type': 'text/html; charset=UTF-8' } }
      );
    }

    return new Response(html, {
      status: upstream.status,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
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
