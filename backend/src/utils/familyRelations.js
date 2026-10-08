/**
 * Family relation helpers.
 *
 * FamilyMember.relationToHead is always stored relative to the family head, so the
 * tree is consistent no matter who added the person. These helpers translate:
 *   - toHeadRelation(): "my Son's Spouse" (as entered by a member) → relation to head
 *   - relationForViewer(): relation to head → relation to whoever is viewing
 * Anything not covered falls back to a descriptive note ("Uncle of Suresh").
 */

const RELATIONS = [
  'Grandfather', 'Grandmother', 'Father', 'Mother', 'Father-in-law', 'Mother-in-law',
  'Uncle', 'Aunt', 'Spouse', 'Brother', 'Sister', 'Brother-in-law', 'Sister-in-law',
  'Son', 'Daughter', 'Son-in-law', 'Daughter-in-law', 'Nephew', 'Niece',
  'Grandson', 'Granddaughter'
];

const FEMALE_RELATIONS = /mother|daughter|sister|aunt|niece|wife/i;
const MALE_RELATIONS = /father|son|brother|uncle|nephew|husband/i;

const genderFromRelation = (relation) => {
  if (!relation) return '';
  if (FEMALE_RELATIONS.test(relation)) return 'Female';
  if (MALE_RELATIONS.test(relation)) return 'Male';
  return '';
};

const isFemale = (gender) => /^f/i.test(gender || '');

// Relation of the head as seen by someone whose relationToHead is `rel`
const pick = (gender, male, female) => (isFemale(gender) ? female : male);

// adderRel = adder's relation to head; rel = new person's relation to the adder
// Returns relation to head, 'Self' when it is the head themself, or null when unknown.
const TO_HEAD = {
  Spouse: {
    Son: 'Son', Daughter: 'Daughter', Grandson: 'Grandson', Granddaughter: 'Granddaughter',
    'Son-in-law': 'Son-in-law', 'Daughter-in-law': 'Daughter-in-law',
    Father: 'Father-in-law', Mother: 'Mother-in-law',
    Brother: 'Brother-in-law', Sister: 'Sister-in-law', Spouse: 'Self'
  },
  Son: {
    Spouse: 'Daughter-in-law', Son: 'Grandson', Daughter: 'Granddaughter',
    Brother: 'Son', Sister: 'Daughter', Grandfather: 'Father', Grandmother: 'Mother'
  },
  Daughter: {
    Spouse: 'Son-in-law', Son: 'Grandson', Daughter: 'Granddaughter',
    Brother: 'Son', Sister: 'Daughter', Grandfather: 'Father', Grandmother: 'Mother'
  },
  Father: {
    Spouse: 'Mother', Daughter: 'Sister', Father: 'Grandfather', Mother: 'Grandmother',
    Grandson: 'Son', Granddaughter: 'Daughter', Brother: 'Uncle', Sister: 'Aunt'
  },
  Mother: {
    Spouse: 'Father', Daughter: 'Sister', Grandson: 'Son', Granddaughter: 'Daughter'
  },
  Brother: {
    Father: 'Father', Mother: 'Mother', Sister: 'Sister', Son: 'Nephew', Daughter: 'Niece',
    Spouse: 'Sister-in-law', Grandfather: 'Grandfather', Grandmother: 'Grandmother'
  },
  Sister: {
    Father: 'Father', Mother: 'Mother', Brother: 'Brother', Son: 'Nephew', Daughter: 'Niece',
    Spouse: 'Brother-in-law', Grandfather: 'Grandfather', Grandmother: 'Grandmother'
  },
  'Daughter-in-law': { Son: 'Grandson', Daughter: 'Granddaughter', Spouse: 'Son' },
  'Son-in-law': { Son: 'Grandson', Daughter: 'Granddaughter', Spouse: 'Daughter' }
};

const toHeadRelation = (adderRelToHead, relToAdder, headGender) => {
  if (!adderRelToHead || adderRelToHead === 'Self') return relToAdder;
  // A child of the head adding their own parents: one of them is the head, the other the spouse
  if (['Son', 'Daughter'].includes(adderRelToHead) && ['Father', 'Mother'].includes(relToAdder) && headGender) {
    const headIsParent = isFemale(headGender) ? 'Mother' : 'Father';
    return relToAdder === headIsParent ? 'Self' : 'Spouse';
  }
  return TO_HEAD[adderRelToHead]?.[relToAdder] || null;
};

// viewerRel = viewer's relation to head; memberRel = member's relation to head
const relationForViewer = (viewerRel, memberRel, headGender, memberGender) => {
  if (!viewerRel || viewerRel === 'Self') return memberRel;
  if (viewerRel === memberRel && !['Son', 'Daughter', 'Brother', 'Sister', 'Grandson', 'Granddaughter'].includes(memberRel)) return null;

  const g = memberGender || genderFromRelation(memberRel);
  const map = {
    Spouse: {
      Self: 'Spouse', Son: 'Son', Daughter: 'Daughter', Grandson: 'Grandson', Granddaughter: 'Granddaughter',
      'Son-in-law': 'Son-in-law', 'Daughter-in-law': 'Daughter-in-law',
      Father: 'Father-in-law', Mother: 'Mother-in-law', Brother: 'Brother-in-law', Sister: 'Sister-in-law'
    },
    Son: {
      Self: pick(headGender, 'Father', 'Mother'), Spouse: pick(headGender, 'Mother', 'Father'),
      Son: 'Brother', Daughter: 'Sister', Father: 'Grandfather', Mother: 'Grandmother',
      Brother: 'Uncle', Sister: 'Aunt', 'Son-in-law': 'Brother-in-law'
    },
    Father: {
      Self: pick(headGender, 'Son', 'Daughter'), Mother: 'Spouse',
      Spouse: pick(headGender, 'Daughter-in-law', 'Son-in-law'),
      Son: 'Grandson', Daughter: 'Granddaughter', Brother: 'Son', Sister: 'Daughter'
    },
    Brother: {
      Self: pick(headGender, 'Brother', 'Sister'), Father: 'Father', Mother: 'Mother',
      Brother: 'Brother', Sister: 'Sister', Son: 'Nephew', Daughter: 'Niece',
      Spouse: pick(headGender, 'Sister-in-law', 'Brother-in-law'),
      Grandfather: 'Grandfather', Grandmother: 'Grandmother'
    }
  };
  map.Daughter = map.Son;
  map.Mother = { ...map.Father, Father: 'Spouse', Mother: undefined };
  map.Sister = map.Brother;

  const rel = map[viewerRel]?.[memberRel];
  if (!rel) return null;
  // Children of the head see each other as siblings; refine by the member's gender
  if (rel === 'Brother' || rel === 'Sister') return pick(g, 'Brother', 'Sister');
  return rel;
};

module.exports = { RELATIONS, genderFromRelation, toHeadRelation, relationForViewer };
