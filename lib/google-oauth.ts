export const useGoogleOAuth = () => ({
  isAvailable: false,
  loading: false,
  initiateSignIn: async () => {},
  initiateSignUp: async (data?: any) => {},
  loadLinkedAccounts: async () => {},
  initiateLink: async () => {},
  unlinkAccount: async (reason?: string) => true,
  hasGoogleAccount: false,
  googleAccount: undefined as any,
});
