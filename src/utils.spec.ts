import { validateEmailFormat } from './utils';

const testHelper = (label: string, email: string, outcome = true) => {
  it(label, () => {
    return outcome === true
      ? expect(validateEmailFormat(email)).toBeTruthy()
      : expect(validateEmailFormat(email)).toBeFalsy()
  })
}

describe('validateEmailFormat()', () => {
  describe('returns true', () => {
    testHelper('when email is correct', 'test@test.test')


    describe('when email has "+"', () => {
      testHelper('before "@"', 'test+@test.test');
      testHelper('after "@"', 'test@+test.test');
      testHelper('in word before "@"', 'te+st@test.test');
      testHelper('in word after "@"', 'test@te+st.test');
      testHelper('before "."', 'test@test+.test');
      testHelper('after "."', 'test@test.+test');
      testHelper('in word after "."', 'test@test.te+st');
    })

    describe('when email has any other special character', () => {
      testHelper('"." before "@"', 'te.st@test.test');
      testHelper('"," before "@"', 'te,st@test.test');
    })
  })

  describe('returns false', () => {
    describe('when email has space', () => {
      testHelper('before "@"', 'test @test.test', false);
      testHelper('after "@"', 'test@ test.test', false);
      testHelper('in word before "@"', 'te st@test.test', false);
      testHelper('in word after "@"', 'test@te st.test', false);
      testHelper('before "."', 'test@test .test', false);
      testHelper('after "."', 'test@test. test', false);
      testHelper('in word after "."', 'test@test.te st', false);
    });
  })
})
