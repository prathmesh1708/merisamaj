/**
 * Move accounts and app content from an OLD sub-community name to its NEW name.
 *
 * For renames made before 2026-11-28, when renaming did not move anyone: the
 * sub-community shows under the new name, but members, Heads and Local Heads still
 * carry the old one (so the renamed sub-community looked new and empty).
 *
 *   Dry run:  node src/scripts/fixSubCommunityRename.js --community "Mali" --from "Nabhvanshi Pool Mali" --to "Naabhvanshi Phool Mali"
 *   Apply:    ...same... --apply
 *
 * The new name must already be one of the community's sub-communities.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const Community = require('../models/Community');
const { cascadeSubCommunityRename } = require('../services/subCommunityRenameService');

const arg = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : null; };
const APPLY = process.argv.includes('--apply');

async function main() {
  const communityName = arg('--community');
  const from = arg('--from');
  const to = arg('--to');
  if (!communityName || !from || !to) throw new Error('Usage: --community <name> --from <old sub name> --to <new sub name> [--apply]');
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured.');
  mongoose.set('autoIndex', false);
  await mongoose.connect(config.mongoUri);

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const community = await Community.findOne({ name: new RegExp(`^\\s*${esc(communityName.trim())}\\s*$`, 'i') });
  if (!community) throw new Error(`Community "${communityName}" not found.`);
  const exists = (community.subCommunities || []).some(s => String(s.name).trim().toLowerCase() === to.trim().toLowerCase());
  if (!exists) throw new Error(`"${to}" is not a sub-community of ${community.name}. Create or rename it first.`);

  const counts = await cascadeSubCommunityRename(community._id, from, to, { dryRun: !APPLY });
  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — ${community.name}: "${from}" → "${to}"`);
  console.log(`  accounts: ${counts.users}, sub-community content: ${counts.subContent}, location content: ${counts.locationContent}`);
  if (!APPLY) console.log('Nothing changed. Add --apply to move them.');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
