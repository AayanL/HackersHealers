import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Console from "@/app/components/Console";
import { SEED_ALERTS, SEED_CONVERSATION, SEED_GLANCE } from "@/lib/assistant";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildPatientContext } from "@/lib/grounding";
import {
  SEED_ALLERGIES,
  SEED_MEDICATIONS,
  SEED_OBSERVATIONS,
  SEED_PATIENT,
  SEED_PROBLEMS,
} from "@/lib/seed";

const baseProps = {
  patient: patientView(SEED_PATIENT, new Date("2026-06-19T12:00:00")),
  meds: mapMedications(SEED_MEDICATIONS),
  allergies: SEED_ALLERGIES,
  codeStatus: "Full code",
  dataMode: "synthetic",
  glance: SEED_GLANCE,
  alerts: SEED_ALERTS,
  initialMessages: SEED_CONVERSATION,
};

describe("Console", () => {
  it("renders the EHR shell, medication list, and assistant dock", () => {
    render(<Console {...baseProps} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Lisinopril 10 mg")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Assistant" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ask the assistant")).toBeInTheDocument();
    expect(
      screen.getByText(/Lisinopril 10 mg daily is active/i),
    ).toBeInTheDocument();
  });

  it("navigates between chart sections from the sidebar", () => {
    const context = buildPatientContext(
      patientView(SEED_PATIENT, new Date("2026-06-19T12:00:00")),
      mapMedications(SEED_MEDICATIONS),
      SEED_PROBLEMS,
      SEED_OBSERVATIONS,
    );
    render(<Console {...baseProps} context={context} />);

    // Defaults to the Medications page.
    expect(screen.getByText("Lisinopril 10 mg")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Problems/i }));
    expect(screen.getByText("Essential hypertension")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Results/i }));
    expect(screen.getAllByTestId("result-row").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Allergies/i }));
    expect(screen.getByTestId("allergy-row")).toBeInTheDocument();
  });

  it("appends a user message and the responder's reply", async () => {
    const respond = vi
      .fn()
      .mockResolvedValue({ id: "x", role: "assistant", text: "Test reply." });
    render(<Console {...baseProps} initialMessages={[]} respond={respond} />);

    fireEvent.change(screen.getByLabelText("Ask the assistant"), {
      target: { value: "Hello?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Hello?")).toBeInTheDocument();
    expect(respond).toHaveBeenCalledWith("Hello?", expect.any(Array));
    await waitFor(() =>
      expect(screen.getByText("Test reply.")).toBeInTheDocument(),
    );
  });
});
