type Invite = {
  denied_at: string | null;
  accepted_at: string | null;
  email_address: string;
  id: string;
};
export const formatInvite = (invite: Invite) => {
  if (invite.accepted_at) {
    return (
      <span className="inline-flex items-center rounded-md bg-mantis-100 px-2 py-1 text-xs font-medium text-mantis-700">
        Accepted
      </span>
    );
  }
  if (invite.denied_at) {
    return (
      <span className="inline-flex items-center rounded-md bg-wewak-100 px-2 py-1 text-xs font-medium text-wewak-700">
        Denied
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-waikawa-gray-100 px-2 py-1 text-xs font-medium text-waikawa-gray-700">
      Pending
    </span>
  );
};
