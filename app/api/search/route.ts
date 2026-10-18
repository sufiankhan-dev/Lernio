import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { openai } from "@ai-sdk/openai";
import {
  generateText,
  isStepCount,
  NoObjectGeneratedError,
  Output,
} from "ai";

import {
  MAX_SEARCH_QUERIES,
  MAX_SEARCH_RESULTS,
  searchOutputSchema,
  searchRequestSchema,
} from "@/lib/search-schema";
import { collectSelections, readOutputSelections } from "@/lib/search-ids";
import type { SearchSelection, SearchStreamEvent } from "@/lib/search-types";
import {
  buildSystemPrompt,
  fetchInitialContext,
  getAgentContext,
  getContextMcpUrl,
  hydrateSearchResults,
} from "@/sanity/lib/search";

export const runtime = "nodejs";
// A search is a multi-step agent run: several groq_query round trips plus the
// structured-output step, each a separate model call. 60s is tight for that.
export const maxDuration = 120;

// A non-reasoning model on purpose. The agent has to emit a structured object in a
// message that does not end in a tool call, and reasoning models make that step less
// predictable. Override with OPENAI_MODEL when a different model suits the account.
const DEFAULT_MODEL = "gpt-4.1";

/**
 * Tools plus the structured-output step. Output generation counts as a step, so this
 * leaves room for the `MAX_SEARCH_QUERIES` groq_query round trips before the model
 * answers.
 *
 * The previous round recorded the model spending its entire step budget querying and
 * never producing the structured output, which the AI SDK surfaces as
 * `AI_NoOutputGeneratedError`. Matching a video moment needs more queries than
 * matching a lesson, so the system prompt's query cap rose to six and this budget
 * rose with it. Every step is a separate billable model call, so the limit stays
 * tight: a generous one lets the agent burn its budget searching and never answer.
 */
const MAX_STEPS = 10;

function encode(event: SearchStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function statusMessage(step: {
  toolCalls?: Array<{ toolName?: string }>;
}): string | null {
  const toolName = step.toolCalls?.[0]?.toolName;
  if (toolName === "groq_query") return "Searching the course library...";
  if (toolName === "schema_explorer") return "Checking the content model...";
  return null;
}

function errorMessage(error: unknown): string {
  if (error instanceof NoObjectGeneratedError) {
    return "Search could not read the library results. Try rephrasing your search.";
  }

  // The detail goes to the server log, never to the browser: an upstream failure
  // can carry an endpoint or a token in its message.
  console.error("[search] request failed:", error);

  return "Search is unavailable right now. Please try again.";
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid search request." },
      { status: 400 },
    );
  }

  const { query } = parsed.data;

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "Search is not configured. Add OPENAI_API_KEY to .env.local." },
      { status: 503 },
    );
  }

  if (!process.env.SANITY_API_READ_TOKEN) {
    return Response.json(
      { error: "Search is not configured. Add SANITY_API_READ_TOKEN to .env.local." },
      { status: 503 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let mcpClient: MCPClient | null = null;

      const send = (event: SearchStreamEvent) => {
        controller.enqueue(encode(event));
      };

      try {
        const agentContext = await getAgentContext();
        const mcpUrl = getContextMcpUrl(agentContext?.slug);
        const initialContext = await fetchInitialContext(mcpUrl);

        controller.enqueue(encode({ type: "status", message: "Reading the content model..." }));

        mcpClient = await createMCPClient({
          transport: {
            type: "http",
            url: mcpUrl,
            headers: {
              Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
            },
          },
        });

        const allTools = await mcpClient.tools();
        // initial_context is dropped because its payload is already in the system
        // prompt, so a call would only repeat it.
        const tools = Object.fromEntries(
          Object.entries(allTools).filter(([name]) => name !== "initial_context"),
        );

        const system = buildSystemPrompt({
          initialContext,
          instructions: agentContext?.instructions ?? null,
          maxResults: MAX_SEARCH_RESULTS,
          maxQueries: MAX_SEARCH_QUERIES,
        });

        const result = await generateText({
          model: openai(process.env.OPENAI_MODEL || DEFAULT_MODEL),
          system,
          prompt: query,
          tools,
          output: Output.object({ schema: searchOutputSchema }),
          stopWhen: isStepCount(MAX_STEPS),
          onStepFinish: (step) => {
            const message = statusMessage(step);
            if (message) send({ type: "status", message });
          },
        });

        let selections: SearchSelection[] = readOutputSelections(result);

        if (selections.length === 0) {
          // The agent ran out of steps before answering. Recover what its
          // groq_query calls already returned; those ids and seconds are real and
          // still get resolved below.
          selections = collectSelections(result.steps.map((step) => step.toolResults));

          if (selections.length > 0) {
            console.warn(
              `[search] no structured output; recovered ${selections.length} selections from tool results`,
            );
          }
        }

        const payload = await hydrateSearchResults(selections, query, MAX_SEARCH_RESULTS);

        send({ type: "results", payload });
      } catch (error) {
        send({ type: "error", message: errorMessage(error) });
      } finally {
        await mcpClient?.close().catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}