import { spawn } from "child_process";
import type OpenAI from "openai";

export const FM_BINARY = "fm";

type ChatCompletionCreateParams =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

type ChatCompletionMessageContent =
  OpenAI.Chat.Completions.ChatCompletionMessageParam["content"];

export interface LLMChatCompletion {
  choices: Array<{ message: { content: string | null } }>;
}

export interface LLMModelsPage {
  data: OpenAI.Models.Model[];
  hasNextPage(): boolean;
  getNextPage(): Promise<LLMModelsPage>;
}

export interface LLMClient {
  chat: {
    completions: {
      create(body: ChatCompletionCreateParams): Promise<LLMChatCompletion>;
    };
  };
  models: {
    list(): Promise<LLMModelsPage>;
  };
}

const clean = (text: string): string =>
  text
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/[⠀-⣿]/g, "")
    .trim();

const messageText = (content: ChatCompletionMessageContent): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
  }
  return "";
};

const runFm = (args: string[], stdin: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(FM_BINARY, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            "The Apple Foundation Models CLI ('fm') was not found. It ships with macOS 27 and later."
          )
        );
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      const out = stdout.trim();
      const err = clean(stderr);

      if (code !== 0 || !out) {
        reject(
          new Error(err || out || `'fm' exited with code ${code} and no output`)
        );
        return;
      }

      resolve(out);
    });

    child.stdin.on("error", () => {});
    child.stdin.write(stdin);
    child.stdin.end();
  });

export const getAppleFoundationClient = (): LLMClient => {
  return {
    chat: {
      completions: {
        create: async (params: ChatCompletionCreateParams) => {
          const model = params.model || "system";

          const instructions = params.messages
            .filter((m) => m.role === "system")
            .map((m) => messageText(m.content))
            .join("\n\n")
            .trim();

          const prompt = params.messages
            .filter((m) => m.role !== "system")
            .map((m) => messageText(m.content))
            .join("\n\n")
            .trim();

          const args = ["respond", "--no-stream", "--model", model];
          if (instructions) {
            args.push("--instructions", instructions);
          }

          const content = await runFm(args, prompt);

          return { choices: [{ message: { content } }] };
        },
      },
    },
    models: {
      list: async () => ({
        data: [
          { id: "system", created: 0, object: "model", owned_by: "apple" },
          { id: "pcc", created: 0, object: "model", owned_by: "apple" },
        ],
        hasNextPage: () => false,
        getNextPage: async () => {
          throw new Error("No more pages");
        },
      }),
    },
  };
};
