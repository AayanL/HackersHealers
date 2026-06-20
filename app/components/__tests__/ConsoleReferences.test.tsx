import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Console from "@/app/components/Console";
import type { ChatMessage } from "@/lib/assistant";
import type { ResourceDetail } from "@/lib/resources";
import type { PatientView } from "@/lib/types";

const patient: PatientView = {
  id: "p1",
  name: "John Smith",
  initials: "JS",
  sexAge: "62 M",
  dob: "1964-03-18",
  mrn: "z",
};

const messages: ChatMessage[] = [
  { id: "a1", role: "assistant", text: "Active [MedicationRequest/55b5db91]." },
];

const resources: Record<string, ResourceDetail> = {
  "MedicationRequest/55b5db91": {
    ref: "MedicationRequest/55b5db91",
    type: "MedicationRequest",
    title: "Nitroglycerin 0.4 mg",
    fields: [{ label: "Status", value: "active" }],
  },
};

const labels = { "MedicationRequest/55b5db91": "Nitroglycerin 0.4 mg" };

describe("Console reference drawer", () => {
  it("opens the reference drawer when a citation chip is clicked, and closes it", () => {
    render(
      <Console
        patient={patient}
        meds={[]}
        initialMessages={messages}
        citationLabels={labels}
        resources={resources}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open reference MedicationRequest/55b5db91",
      }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // The drawer surfaces the raw reference id for traceability.
    expect(screen.getByText("MedicationRequest/55b5db91")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close reference" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
