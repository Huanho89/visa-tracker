// Simple Unit Test Runner for Visa Tracker Logic
const { calculateTimelineSteps } = require("./visa_utils.ts");

// Mocking simple Date toLocaleDateString to run cleanly in pure Node.js environments
if (!Date.prototype.toLocaleDateString) {
  Date.prototype.toLocaleDateString = function() {
    return this.toISOString().split('T')[0];
  };
}

const mockBulletin = {
  category: "F2B",
  filing_date: "2018-06-08",
  final_action_date: "2017-09-22"
};

function assert(condition, message) {
  if (!condition) {
    console.error("❌ FAILED:", message);
    process.exit(1);
  }
  console.log("✅ PASSED:", message);
}

console.log("==========================================");
console.log("RUNNING UNIT TESTS FOR VISA TRACKER LOGIC");
console.log("==========================================");

// --- Test Case 1: Sandbox Check - Priority Date is Current for Filing ---
const sandboxCurrentCase = {
  priority_date: "2017-11-20",
  category: "F2B"
};
const sandboxCurrentSteps = calculateTimelineSteps(sandboxCurrentCase, mockBulletin, true);
assert(sandboxCurrentSteps.length === 5, "Sandbox steps count should be 5");
assert(sandboxCurrentSteps[0].status === "completed", "USCIS step should be completed");
assert(sandboxCurrentSteps[1].status === "completed", "NVC step should be completed");
assert(sandboxCurrentSteps[2].status === "active", "Dates for Filing step should be active (PD <= Filing Date)");
assert(sandboxCurrentSteps[3].status === "pending", "Final Action Date step should be pending");

// --- Test Case 2: Sandbox Check - Priority Date is NOT Current ---
const sandboxPendingCase = {
  priority_date: "2019-01-01",
  category: "F2B"
};
const sandboxPendingSteps = calculateTimelineSteps(sandboxPendingCase, mockBulletin, true);
assert(sandboxPendingSteps[2].status === "pending", "Dates for Filing step should be pending (PD > Filing Date)");
assert(sandboxPendingSteps[3].status === "pending", "Final Action Date step should be pending");

// --- Test Case 3: Member Dashboard - No NVC Case Number ---
const memberNoNvc = {
  priority_date: "2017-11-20",
  category: "F2B",
  nvc_case: null,
  invoice_id: null
};
const memberNoNvcSteps = calculateTimelineSteps(memberNoNvc, mockBulletin, false);
assert(memberNoNvcSteps.length === 9, "Dashboard steps count should be 9");
assert(memberNoNvcSteps[1].status === "active", "NVC Receive step (Step 2) should be active since NVC Case is missing");
assert(memberNoNvcSteps[2].status === "pending", "Step 3 should be pending");

// --- Test Case 4: Member Dashboard - NVC Case entered, but PD > Filing Date ---
const memberNvcNotCurrent = {
  priority_date: "2019-01-01",
  category: "F2B",
  nvc_case: "HCM2021526022",
  invoice_id: null
};
const memberNvcNotCurrentSteps = calculateTimelineSteps(memberNvcNotCurrent, mockBulletin, false);
assert(memberNvcNotCurrentSteps[1].status === "completed", "Step 2 should be completed since NVC Case is entered");
assert(memberNvcNotCurrentSteps[2].status === "active", "Step 3 should be active since Priority Date is not current");
assert(memberNvcNotCurrentSteps[3].status === "pending", "Step 4 should be pending");

// --- Test Case 5: Member Dashboard - Filing Date Current, No Invoice ID ---
const memberNoInvoice = {
  priority_date: "2017-11-20",
  category: "F2B",
  nvc_case: "HCM2021526022",
  invoice_id: null
};
const memberNoInvoiceSteps = calculateTimelineSteps(memberNoInvoice, mockBulletin, false);
assert(memberNoInvoiceSteps[2].status === "completed", "Step 3 should be completed (PD <= Filing Date)");
assert(memberNoInvoiceSteps[3].status === "active", "Step 4 (Pay Fee) should be active since Invoice ID is missing");
assert(memberNoInvoiceSteps[4].status === "pending", "Step 5 should be pending");

// --- Test Case 6: Member Dashboard - Invoice ID entered, No Petitioner ---
const memberNoPetitioner = {
  priority_date: "2017-11-20",
  category: "F2B",
  nvc_case: "HCM2021526022",
  invoice_id: "IVSCA00001821415",
  petitioner: null
};
const memberNoPetitionerSteps = calculateTimelineSteps(memberNoPetitioner, mockBulletin, false);
assert(memberNoPetitionerSteps[3].status === "completed", "Step 4 should be completed");
assert(memberNoPetitionerSteps[4].status === "active", "Step 5 (Submit Docs) should be active since Petitioner details are missing");
assert(memberNoPetitionerSteps[5].status === "pending", "Step 6 should be pending");

// --- Test Case 7: Member Dashboard - Complete info, PD <= Final Action Date ---
const memberFullyCurrent = {
  priority_date: "2017-08-01",
  category: "F2B",
  nvc_case: "HCM2021526022",
  invoice_id: "IVSCA00001821415",
  petitioner: "John Doe",
  consulate: "Ho Chi Minh City, Vietnam"
};
const memberFullyCurrentSteps = calculateTimelineSteps(memberFullyCurrent, mockBulletin, false);
assert(memberFullyCurrentSteps[6].status === "completed", "Step 7 (Final Action) should be completed (PD <= Final Action Date)");
assert(memberFullyCurrentSteps[7].status === "active", "Step 8 (Interview) should be active");
assert(memberFullyCurrentSteps[8].status === "pending", "Step 9 should be pending");

console.log("==========================================");
console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
console.log("==========================================");
