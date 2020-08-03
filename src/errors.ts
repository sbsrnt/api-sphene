export const NETWORK_RESPONSE = {
    ERRORS: {
      USER: {
        MISSING_EMAIL: 'Please provide e-mail.',
        MISSING_PASSWORD: 'Please provide password.',
        EMAIL_EXISTS: 'E-mail already in use.',
        UPDATE_FAIL: 'Couldn\'t update user. Try again later.',
        NOT_REGISTERED: 'User is not registered.',
        NOT_FOUND: 'User with given email doesn\'t exist.',
        PASSWORD_MISMATCH: 'Passwords don\'t match.',
      },
      EMAIL: {
        RECENTLY_SENT: 'E-mail has been sent recently.',
        INVALID_FORMAT: 'E-mail has invalid format.'
      },
      GENERAL: {
        DEFAULT: 'Something went wrong. Try again later.',
        TOKEN_INVALID: 'Token invalid.',
      }
    }
}
