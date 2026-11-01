/* /plan appointment page: https://bonedogstudios.com/plan/a/<token>
   GitHub Pages has no rewrites, so 404.html serves this path and loads this
   file (after plan-ics.js). It reads the token from the path, asks Plan's
   backend for the appointment (get_shared_appointment, anon, POST), and
   renders it. Design: docs/superpowers/specs/2026-10-29-plan-appointment-
   share-link-design.md (vault).
   RULE: every value from the server is written with textContent or an
   attribute setter, never as HTML strings. The business controls those
   strings. When this file or plan-ics.js changes, bump ?v=N in 404.html
   (assets are cached for 10 minutes). */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://wvvysvrswiuusjluwtss.supabase.co';
  // Publishable (anon-role) key, public by design. Read with the Supabase MCP
  // get_publishable_keys at Task D3; never a secret or service key.
  // GET ?t=<token> -> the same .ics bytes as plan-ics.js, served as
  // text/calendar (edge function appointment-ics, verify_jwt off).
  var ICS_URL = SUPABASE_URL + '/functions/v1/appointment-ics';
  var SUPABASE_KEY = 'sb_publishable_IazAzTivS8vS8ZfY90nkPg_fOmBrLWF';
  var APP_STORE = 'https://apps.apple.com/us/app/plan-by-bone-dog-studios/id6777535954';
  var PLAY = 'https://play.google.com/store/apps/details?id=com.bonedogstudios.plan';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  var m = /^\/plan\/a\/([^\/?#]+)\/?$/.exec(location.pathname || '');
  var token = m && UUID.test(m[1]) ? m[1].toLowerCase() : null;
  var root = document.getElementById('content');
  if (!root) return;

  var ua = navigator.userAgent || '';
  var isApple = /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function link(cls, href, text, label) {
    var a = el('a', cls, text);
    a.href = href;
    a.rel = 'noopener noreferrer';
    if (label) a.setAttribute('aria-label', label);
    return a;
  }
  function clear() { while (root.firstChild) root.removeChild(root.firstChild); }

  function rpc(name) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token }),
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function frame(kicker, title, sub) {
    clear();
    root.appendChild(el('p', 'section-kicker', kicker));
    var h = el('h1', 'appt-title', title);
    root.appendChild(h);
    if (sub) root.appendChild(el('p', 'sub', sub));
    return h;
  }

  // The page's main call to action after Confirm (Chance, 2026-11-01): the
  // store badge for this phone, full size, under one line of copy.
  function installBlock(pitch) {
    var row = el('div', 'store-row');
    function badge(cls, href, src, alt) {
      var a = link('store-badge ' + cls, href, null);
      var img = el('img');
      img.src = src; img.alt = alt;
      a.appendChild(img);
      return a;
    }
    var apple = badge('apple', APP_STORE, '/assets/img/badges/app-store-badge.svg', 'Download on the App Store');
    var google = badge('google', PLAY, '/assets/img/badges/google-play-badge.png', 'Get it on Google Play');
    if (isAndroid) row.appendChild(google);
    else if (isApple) row.appendChild(apple);
    else { row.appendChild(apple); row.appendChild(google); }
    var box = el('div', 'appt-install');
    box.appendChild(el('p', 'appt-pitch', pitch));
    box.appendChild(row);
    // Only phones, and only for a well-formed token (a bad path has none).
    if ((isApple || isAndroid) && token) {
      var open = link('btn', 'bonedog://plan/a/' + token, 'Already have /plan? Open it');
      box.appendChild(open);
    }
    return box;
  }

  function showUnavailable() {
    document.title = 'Appointment | /plan';
    frame('/plan', 'This link isn’t active.',
      'It may have expired or been turned off. Contact the business for the details.');
  }

  function showError() {
    frame('/plan', 'We couldn’t load this appointment.',
      'Check your connection and try again.');
    var b = el('button', 'btn solid', 'Try again');
    b.type = 'button';
    b.addEventListener('click', load);
    root.appendChild(b);
  }

  function fmtDay(d) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  }
  function fmtTime(d, zone) {
    return new Intl.DateTimeFormat(undefined, zone ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }
      : { hour: 'numeric', minute: '2-digit' }).format(d);
  }
  // A leading + and digits only: no letters (a "1-800-FLOWERS" number would
  // dial a wrong one) and nothing that could change the scheme.
  function telHref(p) {
    var s = String(p).trim();
    return 'tel:' + (s.charAt(0) === '+' ? '+' : '') + s.replace(/[^0-9]/g, '');
  }

  function googleUrl(a, service, start, end, details, where) {
    var u = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(service + ' · ' + a.business_name) +
      '&dates=' + PlanIcs.utc(start) + '/' + PlanIcs.utc(end) +
      '&details=' + encodeURIComponent(details);
    if (where) u += '&location=' + encodeURIComponent(where);
    return u;
  }

  function render(a) {
    // service_name can be empty (no non-empty check in the table): label it.
    var service = a.service_name || 'Appointment';
    var start = new Date(a.starts_at), end = new Date(a.ends_at);
    var where = [a.location_name, a.address].filter(Boolean).join(', ');
    var pageUrl = 'https://bonedogstudios.com/plan/a/' + token;
    var details = 'Booked with ' + a.business_name + '.' +
      (a.phone ? '\nPhone: ' + a.phone : '') + '\nCheck for changes: ' + pageUrl;
    var cancelled = a.state === 'cancelled';
    var ended = end.getTime() <= Date.now();

    document.title = service + ' with ' + a.business_name + ' | /plan';
    frame('Appointment with ' + a.business_name, service, null);

    var when = el('p', 'appt-when');
    var t1 = el('time', null, fmtDay(start) + ' · ' + fmtTime(start, false));
    t1.setAttribute('datetime', start.toISOString());
    var t2 = el('time', null, fmtTime(end, true));
    t2.setAttribute('datetime', end.toISOString());
    when.appendChild(t1); when.appendChild(document.createTextNode('–')); when.appendChild(t2);
    root.appendChild(when);

    if (where) {
      var place = el('p', 'sub', where + ' ');
      var maps = isApple ? 'https://maps.apple.com/?q=' + encodeURIComponent(where)
        : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(where);
      place.appendChild(link(null, maps, 'Directions', 'Directions, opens a map'));
      root.appendChild(place);
    }
    if (a.phone) {
      var call = el('p', 'sub');
      call.appendChild(link(null, telHref(a.phone), a.phone, 'Call ' + a.business_name + ', ' + a.phone));
      root.appendChild(call);
    }

    var state = el('p', 'appt-state');
    state.setAttribute('aria-live', 'polite');
    // Focus lands here after Confirm removes its button.
    state.setAttribute('tabindex', '-1');
    root.appendChild(state);

    if (cancelled) {
      state.textContent = 'This appointment was cancelled.';
    } else if (ended) {
      state.textContent = 'This appointment has ended.';
    } else if (a.confirmed) {
      state.textContent = 'Confirmed. ' + a.business_name + ' has been told.';
    } else {
      var confirmRow = el('div', 'store-row');
      var c = el('button', 'btn solid', 'Confirm I’ll be there');
      c.type = 'button';
      c.addEventListener('click', function () {
        c.disabled = true;
        rpc('confirm_shared_appointment').then(function (res) {
          if (res && res.confirmed) {
            state.textContent = 'Confirmed. ' + a.business_name + ' has been told.';
            if (confirmRow.parentNode) confirmRow.parentNode.removeChild(confirmRow);
            state.focus();
          } else { load(); }
        }).catch(function () {
          c.disabled = false;
          state.textContent = 'We couldn’t confirm. Check your connection and try again.';
        });
      });
      confirmRow.appendChild(c);
      root.appendChild(confirmRow);
    }

    root.appendChild(installBlock(cancelled || ended
      ? 'Keep every appointment in one place with /plan.'
      : 'Keep this and every appointment in one place with /plan.'));

    // Other calendars: small text links under the app, never above it. The
    // no-break space keeps each dot on the line of the link before it.
    if (!cancelled && !ended) {
      var cal = el('p', 'appt-cal');
      // Safari hands a text/calendar response to Calendar; a Blob download
      // lands in Files instead (spec 2.2), hence the server route here.
      cal.appendChild(link(null, ICS_URL + '?t=' + token, 'Add to Apple Calendar'));
      cal.appendChild(document.createTextNode('\u00a0· '));
      cal.appendChild(link(null, googleUrl(a, service, start, end, details, where),
        'Add to Google Calendar', 'Add to Google Calendar, opens Google Calendar'));
      cal.appendChild(document.createTextNode('\u00a0· '));
      var dl = el('button', 'appt-link', 'Download .ics (Outlook)');
      dl.type = 'button';
      dl.addEventListener('click', function () {
        var text = PlanIcs.build({
          uid: 'share-' + token, start: start, end: end,
          summary: service + ' · ' + a.business_name,
          description: details, location: where || null
        });
        var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
        var href = URL.createObjectURL(blob);
        var tmp = el('a');
        tmp.href = href; tmp.download = 'plan-appointment.ics';
        document.body.appendChild(tmp); tmp.click(); document.body.removeChild(tmp);
        setTimeout(function () { URL.revokeObjectURL(href); }, 60000);
      });
      cal.appendChild(dl);
      root.appendChild(cal);
    }
  }

  function load() {
    if (!token) { showUnavailable(); return; }
    frame('/plan', 'Loading your appointment…', null);
    rpc('get_shared_appointment').then(function (a) {
      // starts_at, not service_name: an empty service name is still a real
      // appointment (business_appointments.service_name has no non-empty check).
      if (!a || typeof a !== 'object' || !a.starts_at) showUnavailable();
      else render(a);
    }).catch(showError);
  }

  load();
})();
