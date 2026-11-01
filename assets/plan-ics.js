/* /plan appointment calendar file (.ics). The same format as the app's
   IcsBuilder (Phase 4 Part D, docs/superpowers/plans/2026-09-12-plan-phase4-
   release-1.1-part-D.md): one VEVENT, UTC times (no VTIMEZONE), CRLF line
   endings, lines folded at 75 UTF-8 octets, RFC 5545 text escaping. Keep the
   two byte-identical: the golden vector in the 1.0.7 plan (Task D2) checks it.
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

  // a: {uid, start: Date, end: Date, summary, description?, location?, stamp?: Date}
  function build(a) {
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bone Dog Studios//Plan//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + a.uid + '@plan',
      'DTSTAMP:' + utc(a.stamp || new Date()),
      'DTSTART:' + utc(a.start),
      'DTEND:' + utc(a.end),
      'SUMMARY:' + esc(a.summary)
    ];
    if (a.description) lines.push('DESCRIPTION:' + esc(a.description));
    if (a.location) lines.push('LOCATION:' + esc(a.location));
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n');
  }

  var api = { build: build, utc: utc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlanIcs = api;
})(this);
