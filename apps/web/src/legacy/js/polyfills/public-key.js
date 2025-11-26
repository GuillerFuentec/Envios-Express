'use strict';

(() => {
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.PublicKeyCredential === 'undefined') {
    window.PublicKeyCredential = function PublicKeyCredentialPolyfill() {};
  }

  const pkc = window.PublicKeyCredential;

  if (
    typeof pkc.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    pkc.isUserVerifyingPlatformAuthenticatorAvailable = () =>
      Promise.resolve(false);
  }

  if (typeof pkc.isConditionalMediationAvailable !== 'function') {
    pkc.isConditionalMediationAvailable = () => Promise.resolve(false);
  }
})();
