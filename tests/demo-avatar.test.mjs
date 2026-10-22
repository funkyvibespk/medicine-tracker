import test from "node:test";
import assert from "node:assert/strict";
import { getDemoAvatarColor, getDemoAvatarInitials } from "../lib/demoAvatar.ts";

const firstEmail = "kamran.dataentry@gmail.com";
const secondEmail = "kamrankhan.dataentry@gmail.com";
const thirdEmail = "funkyvibes@gmail.com";

test("similar account emails receive distinguishing initials", () => {
  assert.equal(getDemoAvatarInitials(firstEmail), "KD");
  assert.equal(getDemoAvatarInitials(secondEmail), "KK");
  assert.equal(getDemoAvatarInitials(thirdEmail), "F");
  assert.notEqual(getDemoAvatarInitials(firstEmail), getDemoAvatarInitials(secondEmail));
});

test("avatar initials and color normalize email case and surrounding whitespace", () => {
  assert.equal(getDemoAvatarInitials(`  ${firstEmail.toUpperCase()} `), getDemoAvatarInitials(firstEmail));
  assert.equal(getDemoAvatarColor(`  ${firstEmail.toUpperCase()} `), getDemoAvatarColor(firstEmail));
});

test("avatar color is stable and distinct for the specified accounts", () => {
  const firstColor = getDemoAvatarColor(firstEmail);
  assert.equal(getDemoAvatarColor(firstEmail), firstColor);
  const secondColor = getDemoAvatarColor(secondEmail);
  const thirdColor = getDemoAvatarColor(thirdEmail);
  assert.notEqual(firstColor, secondColor);
  assert.notEqual(firstColor, thirdColor);
  assert.notEqual(secondColor, thirdColor);
  assert.equal(getDemoAvatarColor(secondEmail), secondColor);
  assert.equal(getDemoAvatarColor(thirdEmail), thirdColor);
});

test("empty and malformed emails use readable fallback initials and color", () => {
  assert.equal(getDemoAvatarInitials(null), "?");
  assert.equal(getDemoAvatarInitials("not-an-email"), "?");
  assert.equal(getDemoAvatarColor(""), getDemoAvatarColor(undefined));
  assert.equal(getDemoAvatarColor("not-an-email"), getDemoAvatarColor(undefined));
});
