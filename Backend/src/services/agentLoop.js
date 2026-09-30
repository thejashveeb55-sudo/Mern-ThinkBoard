import OpenAI from "openai";
import { getCompanySummary, findTasksMatching } from "./agentTools.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Tool SCHEMAS sent to the LLM — plain-English descriptions + parameter shape.
// Note: requestingUserId is deliberately NOT a parameter here — the LLM never
// supplies it. It's injected by OUR code when we actually execute the tool,
// from the server-verified req.userId, never from anything the LLM says.
const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "getCompanySummary",
      description:
        "Get a summary of task activity — counts by status. Scoped to the requester's own teams unless they are an admin, in which case it covers the whole company.",
      parameters: { type: "object", properties: {} }, // no LLM-supplied args needed
    },
  },
  {
    type: "function",
    function: {
      name: "findTasksMatching",
      description:
        "Search for tasks and comments semantically similar to a natural-language query, scoped to teams the requester belongs to.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to search for" },
        },
        required: ["query"],
      },
    },
  },
];

// Maps a tool name to the actual function that executes it.
// requestingUserId is always injected by us, never taken from LLM args.
async function executeTool(name, args, requestingUserId) {
  if (name === "getCompanySummary") {
    return getCompanySummary(requestingUserId);
  }
  if (name === "findTasksMatching") {
    return findTasksMatching(args.query, requestingUserId);
  }
  throw new Error(`Unknown tool: ${name}`);
}

export async function runAgentLoop(userMessage, requestingUserId) {
  const messages = [{ role: "user", content: userMessage }];

  // First call: let the LLM decide whether it needs a tool at all.
  const first = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages,
    tools: TOOL_SCHEMAS,
  });

  const responseMessage = first.choices[0].message;
  const toolCalls = responseMessage.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    // LLM answered directly, no tool needed (e.g. "hello" or general chat).
    return responseMessage.content;
  }

  // Execute every requested tool call, feed results back as new messages.
  messages.push(responseMessage);

  for (const toolCall of toolCalls) {
    let args;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (err) {
      // Malformed args from the LLM — don't crash the loop, feed the
      // error back so the LLM can recover or explain the failure.
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: "Error: could not parse tool arguments.",
      });
      continue;
    }

    let result;
    try {
      result = await executeTool(toolCall.function.name, args, requestingUserId);
    } catch (err) {
      result = `Error executing tool: ${err.message}`;
    }

    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }

  // Second call: LLM turns the tool result(s) into a natural-language answer.
  const second = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages,
  });

  return second.choices[0].message.content;
}