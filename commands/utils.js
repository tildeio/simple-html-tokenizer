'use strict';
const os = require('os');
const got = require('got');
const fs = require('fs');

const CACHE = getCache();

process.on('exit', writeCache.bind(null, CACHE));

exports.getGithubRefSHA = getGithubRefSHA;
exports.githubContentURL = githubContentURL;
exports.getText = getText;
exports.getJSON = getJSON;

function getText(url) {
  return got(url, { cache: CACHE }).then(res => res.body);
}

function getJSON(url) {
  return got(url, { cache: CACHE, json: true }).then(res => res.body);
}

async function getGithubRefSHA(owner, repo, ref) {
  let body = await getJSON(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${ref}`
  );
  return body.object.sha;
}

function githubContentURL(owner, repo, sha, path) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`;
}

function getCache() {
  try {
    return new Map(
      JSON.parse(fs.readFileSync(`${os.tmpdir()}/___got_cache__.json`, 'utf8'))
    );
  } catch (e) {
    return new Map();
  }
}

function writeCache(cache) {
  fs.writeFileSync(
    `${os.tmpdir()}/___got_cache__.json`,
    JSON.stringify(Array.from(cache))
  );
}
