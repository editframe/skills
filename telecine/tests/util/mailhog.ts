export const MAILHOG_URL = process.env.MAILHOG_URL!;

export const deleteAllEmails = async () => {
  try {
    return await fetch(`${MAILHOG_URL}/api/v1/messages`, { method: "DELETE" });
  } catch (error) {
    console.log("Fetch error", error);
    throw error;
  }
};

export const deleteEmailsForAddress = async (address: string) => {
  try {
    // First get all messages for this address
    const messagesUrl = `${MAILHOG_URL}/api/v2/search?kind=to&query=${address}&limit=100&start=0`;
    const response = await fetch(messagesUrl);
    const messages = await response.json();

    // Delete each message individually
    const deletePromises = messages.items.map((message: any) =>
      fetch(`${MAILHOG_URL}/api/v1/messages/${message.ID}`, {
        method: "DELETE",
      }),
    );

    await Promise.all(deletePromises);
  } catch (error) {
    console.log("Fetch error", error);
    throw error;
  }
};

function decodeQuotedPrintable(data: string) {
  // normalise end-of-line signals
  data = data.replace(/(\r\n|\n|\r)/g, "\n");

  // replace equals sign at end-of-line with nothing
  data = data.replace(/=\n/g, "");

  // encoded text might contain percent signs
  // decode each section separately
  const bits = data.split("%");
  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i];
    if (!bit) continue;
    // replace equals sign with percent sign
    bits[i] = bit.replace(/=/g, "%");

    // decode the section
    bits[i] = decodeURIComponent(bits[i]!);
  }

  // join the sections back together
  return bits.join("%");
}

export const getMostRecentMessage = async (
  recieverAddress: string,
  subject: string,
) => {
  const messagesUrl = `${MAILHOG_URL}/api/v2/search?kind=to&query=${recieverAddress}&limit=100&start=0`;
  const response = await fetch(messagesUrl);
  const messages = await response.json();

  const message = messages.items.find((m: any) =>
    decodeQuotedPrintable(m.Content.Headers.Subject[0]).includes(subject),
  );
  return {
    body: decodeQuotedPrintable(message.Content.Body).replaceAll(
      process.env.WEB_HOST!,
      process.env.PLAYWRIGHT_WEB_HOST!,
    ),
    from: message.Content.Headers.From[0],
    to: message.Content.Headers.To[0],
    subject: decodeQuotedPrintable(message.Content.Headers.Subject[0]),
  };
};
