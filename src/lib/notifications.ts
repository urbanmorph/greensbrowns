/**
 * Notification service stubs for MVP.
 *
 * All methods log to console with a [NOTIFICATION STUB] prefix.
 * In Phase 2, replace implementations with MSG91/Twilio calls.
 */

const PREFIX = "[NOTIFICATION STUB]";

export function notifyAgreementSigned(
  orgName: string,
  orgId: string,
  userEmail: string | undefined
) {
  console.log(
    `${PREFIX} Agreement signed — org: "${orgName}" (${orgId}), user: ${userEmail}`
  );
  console.log(
    `${PREFIX}   → Would send email to ADMIN: "New BWG '${orgName}' signed the service agreement"`
  );
  console.log(
    `${PREFIX}   → Would send email to BWG (${userEmail}): "Your signed service agreement for '${orgName}' is stored"`
  );
}

export function notifyPickupAssigned(
  pickupId: string,
  collectorName: string,
  orgName: string
) {
  console.log(
    `${PREFIX} Pickup assigned — pickup: ${pickupId}, collector: "${collectorName}", org: "${orgName}"`
  );
  console.log(
    `${PREFIX}   → Would send SMS/email to collector: "New pickup assigned from ${orgName}"`
  );
  console.log(
    `${PREFIX}   → Would send notification to BWG: "Collector ${collectorName} assigned to your pickup"`
  );
}

export function notifyStatusChange(
  pickupId: string,
  oldStatus: string,
  newStatus: string,
  recipientEmail: string | undefined
) {
  console.log(
    `${PREFIX} Status change — pickup: ${pickupId}, ${oldStatus} → ${newStatus}, notify: ${recipientEmail}`
  );
  console.log(
    `${PREFIX}   → Would send notification: "Pickup ${pickupId} status changed to ${newStatus}"`
  );
}

export function notifyEmergencyPickup(
  pickupId: string,
  orgName: string,
  address: string
) {
  console.log(
    `${PREFIX} Emergency pickup — pickup: ${pickupId}, org: "${orgName}", address: "${address}"`
  );
  console.log(
    `${PREFIX}   → Would send URGENT notification to admin + nearby collectors`
  );
}

export function notifyDisputeUpdate(
  disputeId: string,
  status: string,
  raisedByEmail: string | undefined
) {
  console.log(
    `${PREFIX} Dispute update — dispute: ${disputeId}, status: ${status}, raised by: ${raisedByEmail}`
  );
  console.log(
    `${PREFIX}   → Would send email to user: "Your dispute ${disputeId} is now ${status}"`
  );
}
