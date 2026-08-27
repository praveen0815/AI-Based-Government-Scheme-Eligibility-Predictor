import { describe, expect, it } from "vitest";
import { EMPTY_FORM, validateCitizenForm } from "../utils/validateCitizen";
import { VALID_PROFILE } from "./fixtures";
import { profileToForm } from "../utils/validateCitizen";

describe("validateCitizenForm", () => {
  it("accepts a complete valid profile", () => {
    const { errors, profile } = validateCitizenForm(profileToForm(VALID_PROFILE));
    expect(errors).toEqual({});
    expect(profile).toEqual(VALID_PROFILE);
  });

  it("rejects a missing required field", () => {
    const { errors, profile } = validateCitizenForm(EMPTY_FORM);
    expect(profile).toBeNull();
    expect(errors.gender).toBe("Please select your gender.");
    expect(errors.age).toBe("Age is required.");
  });

  it("rejects an invalid age", () => {
    const values = profileToForm(VALID_PROFILE);
    values.age = "150";
    const { errors, profile } = validateCitizenForm(values);
    expect(profile).toBeNull();
    expect(errors.age).toBe("Age must be between 0 and 120.");
  });

  it("rejects negative land", () => {
    const values = profileToForm(VALID_PROFILE);
    values.wet_land_acres = "-1";
    const { errors, profile } = validateCitizenForm(values);
    expect(profile).toBeNull();
    expect(errors.wet_land_acres).toBe("Land area cannot be negative.");
  });
});
