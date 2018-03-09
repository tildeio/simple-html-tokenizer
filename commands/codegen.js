'use strict';
const fs = require('fs');
const path = require('path');
const { getGithubRefSHA, githubContentURL, getText } = require('./utils');

const GENERATED_ROOT = path.resolve(__dirname, '../src/generated');

module.exports = async function codegen(
  ui,
  owner,
  repo,
  ref,
  src,
  dest,
  generator
) {
  ui.writeInfoLine(`getting sha for ${owner}/${repo} ${ref}`);
  const sha = await getGithubRefSHA(owner, repo, ref);
  const url = githubContentURL(owner, repo, sha, src);

  ui.writeInfoLine(`downloading ${url}`);
  const body = await getText(url);
  let code = `/**
 * generated from ${url}
 * do not edit
 */
`;
  code += generator(body);
  fs.writeFileSync(path.resolve(GENERATED_ROOT, dest), code);
  ui.writeInfoLine(`generated ${dest}`);
};
