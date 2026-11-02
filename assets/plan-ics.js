/* /plan appointment calendar file (.ics). The same format as the app's
   IcsBuilder (Phase 4 Part D, docs/superpowers/plans/2026-09-12-plan-phase4-
   release-1.1-part-D.md): one VEVENT, CRLF line endings, lines folded at 75
   UTF-8 octets, RFC 5545 text escaping. Times are UTC unless the caller passes
   the viewer's IANA zone (tz): then DTSTART/DTEND carry TZID wall-clock times
   and a one-offset VTIMEZONE (the zone's offset at the start), so iOS Calendar
   shows no "(GMT)" line (1.0.7 b45 E3, F-4). If Intl cannot resolve the zone,
   the file is the UTC form, byte for byte. Keep this and the edge function
   appointment-ics (Plan supabase/functions/appointment-ics/ics.ts) byte-
   identical: the golden vectors V1-V6 (vault harness golden.js) check it.
   Loaded by plan-appointment.js; require()-able by node for that check. */
(function (root) {
  'use strict';

  function two(n) { return (n < 10 ? '0' : '') + n; }

  function utc(d) {
    var y = String(d.getUTCFullYear());
    while (y.length < 4) y = '0' + y;
    return y + two(d.getUTCMonth() + 1) + two(d.getUTCDate()) + 'T' +
      two(d.getUTCHours()) + two(d.getUTCMinutes()) + two(d.getUTCSeconds()) + 'Z';
  }

  // Offset of an IANA zone at an instant, in whole seconds, or null when Intl
  // cannot say. en-US + h23 on purpose: longOffset text is locale-shaped.
  function zoneOffset(zone, ms) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric',
        day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
      }).formatToParts(new Date(ms));
      var v = {};
      for (var i = 0; i < parts.length; i++) v[parts[i].type] = parseInt(parts[i].value, 10);
      var local = Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute, v.second);
      var off = Math.round((local - Math.floor(ms / 1000) * 1000) / 1000);
      return isFinite(off) ? off : null;
    } catch (e) { return null; }
  }
  function offStr(sec) {
    var a = Math.abs(sec);
    return (sec < 0 ? '-' : '+') + two(Math.floor(a / 3600)) + two(Math.floor(a % 3600 / 60)) +
      (a % 60 ? two(a % 60) : '');
  }
  // Wall-clock of an instant in a zone with a fixed offset, no trailing Z.
  function wall(d, off) { return utc(new Date(d.getTime() + off * 1000)).slice(0, -1); }

  // RFC 5545 3.3.11, in the same order as the Dart builder. A lone CR is a
  // line break too: left raw, a parser could read the rest as a new property.
  function esc(s) {
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\r|\n/g, '\\n');
  }

  function utf8Len(cp) { return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4; }

  // RFC 5545 3.1: continuation lines start with one space, so they carry 74.
  function fold(line) {
    var out = '', cur = '', width = 0, first = true;
    for (var i = 0; i < line.length;) {
      var cp = line.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      i += ch.length;
      var w = utf8Len(cp);
      if (width + w > (first ? 75 : 74)) {
        out += cur + '\r\n ';
        cur = ''; width = 0; first = false;
      }
      cur += ch; width += w;
    }
    return out + cur;
  }

  // a: {uid, start: Date, end: Date, summary, description?, location?, stamp?: Date,
  //     tz?: IANA zone}. The end's wall time uses the start's offset: an
  //     appointment that spans a DST change imports an hour short in Apple and
  //     Google Calendar (accepted, b45 S-L2); Outlook reads the VTIMEZONE.
  function build(a) {
    var off = a.tz ? zoneOffset(a.tz, a.start.getTime()) : null;
    var zoned = off !== null;
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bone Dog Studios//Plan//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    if (zoned) {
      lines.push('BEGIN:VTIMEZONE', 'TZID:' + a.tz, 'BEGIN:STANDARD', 'DTSTART:19700101T000000',
        'TZOFFSETFROM:' + offStr(off), 'TZOFFSETTO:' + offStr(off), 'END:STANDARD', 'END:VTIMEZONE');
    }
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + a.uid + '@plan',
      'DTSTAMP:' + utc(a.stamp || new Date()),
      zoned ? 'DTSTART;TZID=' + a.tz + ':' + wall(a.start, off) : 'DTSTART:' + utc(a.start),
      zoned ? 'DTEND;TZID=' + a.tz + ':' + wall(a.end, off) : 'DTEND:' + utc(a.end),
      'SUMMARY:' + esc(a.summary)
    );
    if (a.description) lines.push('DESCRIPTION:' + esc(a.description));
    if (a.location) lines.push('LOCATION:' + esc(a.location));
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n');
  }

  var api = { build: build, utc: utc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlanIcs = api;
})(this);
