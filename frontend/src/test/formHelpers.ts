import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export async function fillCitizenForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Age"), "20");
  await user.selectOptions(screen.getByLabelText("Gender"), "female");
  await user.selectOptions(screen.getByLabelText("Are you currently a student?"), "true");
  await user.selectOptions(screen.getByLabelText("Is this your first higher-education course?"), "true");
  await user.selectOptions(screen.getByLabelText("Where did you complete Classes 6–12?"), "government_6_to_12");
  await user.selectOptions(screen.getByLabelText("Marital status"), "never_married");
  await user.selectOptions(screen.getByLabelText("Are you an orphan?"), "false");
  await user.selectOptions(screen.getByLabelText("Are you considered destitute?"), "false");
  await user.selectOptions(screen.getByLabelText("Occupation"), "other");
  await user.type(screen.getByLabelText("Wet land owned (acres)"), "0");
  await user.type(screen.getByLabelText("Dry land owned (acres)"), "0");
  return user;
}
