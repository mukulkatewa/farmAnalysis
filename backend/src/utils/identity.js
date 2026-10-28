// Only Firebase's verified claim determines anonymous access, never body/profile flags.
export const isGuestIdentity = user => user?.firebase?.sign_in_provider === 'anonymous';
