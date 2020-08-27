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
        UNAUTHORIZED: 'Unauthorized.'
      },
      REMINDER: {
        MISSING_TITLE: 'Title is required.',
        MISSING_REMIND_AT: 'Remind At is required.',
        ADD_FAIL: 'Couldn\'t add reminder.',
        UPDATE_FAIL: 'Couldn\'t update reminder.',
        DELETE_FAIL: 'Couldn\'t delete reminder.',
        GET_ALL_FAIL: "Couldn't find reminders. Try again later.",
        NOT_FOUND: "Couldn't find reminder. Try again later.",
        NOT_ALLOWED: "Not allowed.",
        UNSUPPORTED_TYPE: "Type is not supported.",
        UNSUPPORTED_OCCURRENCE: "Occurrence is not supported."
      }
    }
}
