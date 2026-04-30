export const ETHIOPIAN_UNIVERSITIES = [
  'Addis Ababa University',
  'Bahir Dar University',
  'Mekelle University',
  'Jimma University',
  'Hawassa University',
  'Gondar University',
  'Adama Science and Technology University',
  'Arba Minch University',
  'Haramaya University',
  'Dire Dawa University',
  'Wollo University',
  'Debre Berhan University',
  'Debre Markos University',
  'Wollega University',
  'Wolaita Sodo University',
  'Dilla University',
  'Ambo University',
  'Axum University',
  'Wachemo University',
  'Wolkite University',
  'Ethiopia',
  'Addis Ababa Institute of Technology',
  'Ethiopian Institute of Architecture',
  'Ethiopian Institute of Agricultural Research',
  ' Addis Ababa',
  'Bahir Dar',
  'Mekelle',
  'Jimma',
] as const;

export type EthiopianUniversity = typeof ETHIOPIAN_UNIVERSITIES[number];

export function isEthiopianAffiliation(affiliation: string): boolean {
  const normalized = affiliation.toLowerCase();
  return ETHIOPIAN_UNIVERSITIES.some(
    (uni) => normalized.includes(uni.toLowerCase())
  );
}

export function extractEthiopianAffiliations(affiliations: string[]): string[] {
  return affiliations.filter((affiliation) => isEthiopianAffiliation(affiliation));
}
