export interface SSEMessage {
  event: string;
  data: string;
}

export async function* readSSE(
  response: Response,
): AsyncGenerator<SSEMessage> {
  if (!response.body) throw new Error("No response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "message";
  let data = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, "");
      buffer = buffer.slice(idx + 1);

      if (line === "") {
        if (data) {
          yield { event, data };
          event = "message";
          data = "";
        }
        continue;
      }
      if (line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      const val = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
      if (field === "event") event = val;
      else if (field === "data") data = data ? data + "\n" + val : val;
    }
  }
}
