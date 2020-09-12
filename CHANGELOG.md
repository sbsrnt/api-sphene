# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.0.1](https://github.com/sbsrnt/api-sphene/compare/v1.0.0...v1.0.1) (2020-09-12)

## 1.0.0 (2020-09-12)


### Features

* **app:** enable cors ([5fa33f0](https://github.com/sbsrnt/api-sphene/commit/5fa33f0a07d41ceaede6c899aa437b960123a3a4))
* **auth:** add email format validator ([0e04968](https://github.com/sbsrnt/api-sphene/commit/0e04968c8d59cc5dcbc02bf31d00ceacb91ed329))
* **auth:** add password hashing ([12ad6c0](https://github.com/sbsrnt/api-sphene/commit/12ad6c0ba3e71f1b6bae4d7bfba537f1f13c989e))
* **auth:** add reminders module with addNewReminder method ([4b415e3](https://github.com/sbsrnt/api-sphene/commit/4b415e37b334526752efeb925a0f67cecab53ca0))
* **auth:** add uuid(v4) to email and reset password tokens ([834f375](https://github.com/sbsrnt/api-sphene/commit/834f3758ecd10f911de105ffa6db3ce66c964625))
* **mailers:** create sending mail service and move credentials to env variables ([99e79a4](https://github.com/sbsrnt/api-sphene/commit/99e79a4a7ad4f2d623bf827904a81a001d990964))
* **mailers:** create user verification mail module ([53859c7](https://github.com/sbsrnt/api-sphene/commit/53859c79849e69b71f00f3b6318797e27f54f219))
* **mailers:** reset password ([7ab3693](https://github.com/sbsrnt/api-sphene/commit/7ab369356cc323cb557c345eac9d353db72fc6b1))
* **reminders:** add deleteReminder method ([791d80c](https://github.com/sbsrnt/api-sphene/commit/791d80c00c3c69c6d37ea5f2cd9a09adbb38c74f))
* **reminders:** add logger to all functions ([193b782](https://github.com/sbsrnt/api-sphene/commit/193b7825a0a0b29de303ada831157a791fdff619))
* **reminders:** add upcoming reminders ([f79af91](https://github.com/sbsrnt/api-sphene/commit/f79af91f25137f215bd479c377b26e1abc8e9ad5))
* **reminders:** add updateReminder method ([9b4ab39](https://github.com/sbsrnt/api-sphene/commit/9b4ab399f37cc19acc24bbe6d1b3b41d39c1a0cd))
* **reminders:** auto update overdue reminders to their occurrences ([7164953](https://github.com/sbsrnt/api-sphene/commit/71649536c8eced181401634ecffb25b795c25b64))


### Bug Fixes

* **auth:** add password hash to reset password service ([257ed24](https://github.com/sbsrnt/api-sphene/commit/257ed24df45f8dd9186aaf2c8f7e820bd36f6b69))
* **auth:** change forgot password http method from GET to POST ([0a51fb9](https://github.com/sbsrnt/api-sphene/commit/0a51fb949d459f9ca99875dd6453762dc6fc90ab))
* **auth:** email verification token deletion upon verifying link click ([82eb65a](https://github.com/sbsrnt/api-sphene/commit/82eb65abf2e45e2817adcbaba1e2c0549d137dd3))
* **reminders:** update column type for remindAt ([28fe015](https://github.com/sbsrnt/api-sphene/commit/28fe0154eb30e5f0716d1b72146c54426d51f994))
