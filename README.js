// Reupload from the last version on
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
// before it was taken down (append '$revision/1411197' to see that page).

// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/**
 * Transforms a valid match pattern into a regular expression
 * which matches all URLs included by that pattern.
 *
 * @param  {string}  pattern  The pattern to transform.
 * @return {RegExp}           The pattern's equivalent as a RegExp.
 * @throws {TypeError}        If the pattern is not a valid MatchPattern
 */
function matchPatternToRegexp(pattern) {
    if (pattern === '') {
        return /^(?:http|https|ws|wss|file|ftp|ftps):\/\//;
    }

    const schemeSegment = '(\\*|http|https|ws|wss|file|ftp|ftps)';
    const hostSegment = '(\\*|(?:\\*\\.)?(?:[^/*]+))?';
    const pathSegment = '(.*)';
    const matchPatternRegExp = new RegExp(
        `^${schemeSegment}://${hostSegment}/${pathSegment}$`
    );

    const match = matchPatternRegExp.exec(pattern);
    if (!match) {
        throw new TypeError(`"${pattern}" is not a valid MatchPattern`);
    }

    let [, scheme, host, path] = match;
    if (!host && scheme !== 'file') {
        throw new TypeError(`"${pattern}" does not have a valid host`);
    }

    const schemeRegex = scheme === '*' ? '(http|https|ws|wss)' : scheme;

    let hostRegex = '';
    if (host) {
        if (host === '*') {
            hostRegex = '[^/]+?';
        } else {
            if (host.startsWith('*.')) {
                hostRegex = '(?:[^/]+?\\.)?';
                host = host.substring(2);
            }
            hostRegex += host.replace(/\./g, '\\.');
        }
    }

    let pathRegex = '/?';
    if (path) {
        if (path === '*') {
            pathRegex = '(/.*)?';
        } else if (path.charAt(0) !== '/') {
            pathRegex = `/${path.replace(/\./g, '\\.').replace(/\*/g, '.*?')}`;
        }
    }

    const regex = `^${schemeRegex}://${hostRegex}${pathRegex}$`;
    return new RegExp(regex);
}

// Test harness is made for running in a browser scratchpad / console setup.
// Cases should match what's on the MDN page.
// https://hg.mozilla.org/mozilla-central/file/tip/toolkit/components/extensions/MatchPattern.cpp
// is also a useful reference (if not present, replace tip with bb0febbdbb25).
function test() {
    const testCases = [
        [
            "<all_urls>",
            ["http://example.org/", "https://a.org/some/path/", "ws://sockets.somewhere.org/", "wss://ws.example.com/stuff/", "ftp://files.somewhere.org/", "ftps://files.somewhere.org/"],
            []
        ],
        [
            "*://*/*",
            ["http://example.org/", "https://a.org/some/path/", "ws://sockets.somewhere.org/", "wss://ws.example.com/stuff/"],
            ["ftp://ftp.example.org/", "ftps://ftp.example.org/", "file:///a/"]
        ],
        [
            "*://*.mozilla.org/*",
            ["http://mozilla.org/", "https://mozilla.org/", "http://a.mozilla.org/", "http://a.b.mozilla.org/", "https://b.mozilla.org/path/", "ws://ws.mozilla.org/", "wss://secure.mozilla.org/something"],
            ["ftp://mozilla.org/", "http://mozilla.com/", "http://firefox.org/"]
        ],
        [
            "*://mozilla.org/",
            ["http://mozilla.org/", "https://mozilla.org/", "ws://mozilla.org/", "wss://mozilla.org/"],
            ["ftp://mozilla.org/", "http://a.mozilla.org/", "http://mozilla.org/a"]
        ],
        [
            "ftp://mozilla.org/",
            ["ftp://mozilla.org"],
            ["http://mozilla.org/", "ftp://sub.mozilla.org/", "ftp://mozilla.org/path"]
        ],
        [
            "https://*/path",
            ["https://mozilla.org/path", "https://a.mozilla.org/path", "https://something.com/path"],
            ["http://mozilla.org/path", "https://mozilla.org/path/", "https://mozilla.org/a", "https://mozilla.org/"]
        ],
        [
            "https://*/path/",
            ["https://mozilla.org/path/", "https://a.mozilla.org/path/", "https://something.com/path/"],
            ["http://mozilla.org/path/", "https://mozilla.org/path", "https://mozilla.org/a", "https://mozilla.org/"]
        ],
        [
            "https://mozilla.org/*",
            ["https://mozilla.org/", "https://mozilla.org/path", "https://mozilla.org/another", "https://mozilla.org/path/to/doc"],
            ["http://mozilla.org/path", "https://mozilla.com/path"]
        ],
        [
            "https://mozilla.org/a/b/c/",
            ["https://mozilla.org/a/b/c/"],
        ["https://yomozilla.org/a/b/c/", "https://mozilla.org/a/b/c", "http://mozilla.org/a/b/c/"]
        ],
        [
            "https://mozilla.org/*/b/*/",
            ["https://mozilla.org/a/b/c/", "https://mozilla.org/d/b/f/", "https://mozilla.org/a/b/c/d/"],
            ["https://mozilla.org/b/*/", "https://mozilla.org/a/b/"]
        ],
        [
            "file:///blah/*",
            ["file:///blah/", "file:///blah/bleh"],
            ["file:///bleh/"]
        ]
    ];
    return Array.map(testCases, ([pat, pass, fail]) => {
        const regex = matchPatternToRegexp(pat);
        return [pat, regex, pass.filter(s => !s.match(regex)), fail.filter(s => s.match(regex))];
    });
}
