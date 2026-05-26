import type { IncomingMessage, ServerResponse } from "node:http";
import { once } from "node:events";
import { Endpoint } from "../shared/api.ts";
import { handleModAction, handleAutomodFilter, handleModMail, handleAppInstall } from "./triggers.ts";
import {
  caseFileForm,
  caseFileMenu,
  lookupUserForm,
  lookupUserMenu,
  recentLogMenu,
} from "./menus.ts";

export async function serverOnRequest(req: IncomingMessage, rsp: ServerResponse): Promise<void> {
  try {
    await route(req, rsp);
  } catch (err) {
    const msg = `server error; ${err instanceof Error ? err.stack : err}`;
    console.error(msg);
    writeJSON(500, { error: msg }, rsp);
  }
}

async function route(req: IncomingMessage, rsp: ServerResponse): Promise<void> {
  const url = req.url ?? "";
  switch (url) {
    case Endpoint.OnModAction:
      await handleModAction(await readJSON(req));
      return writeJSON(200, {}, rsp);
    case Endpoint.OnAutomodFilterPost:
      await handleAutomodFilter(await readJSON(req), "post");
      return writeJSON(200, {}, rsp);
    case Endpoint.OnAutomodFilterComment:
      await handleAutomodFilter(await readJSON(req), "comment");
      return writeJSON(200, {}, rsp);
    case Endpoint.OnModMail:
      await handleModMail(await readJSON(req));
      return writeJSON(200, {}, rsp);
    case Endpoint.OnAppInstall:
      await handleAppInstall();
      return writeJSON(200, {}, rsp);
    case Endpoint.MenuLookupUser:
      return writeJSON(200, await lookupUserMenu(), rsp);
    case Endpoint.FormLookupUser:
      return writeJSON(200, await lookupUserForm(await readJSON(req)), rsp);
    case Endpoint.MenuRecentLog:
      return writeJSON(200, await recentLogMenu(), rsp);
    case Endpoint.MenuCaseFile:
      return writeJSON(200, await caseFileMenu(), rsp);
    case Endpoint.FormCaseFile:
      return writeJSON(200, await caseFileForm(await readJSON(req)), rsp);
    default:
      return writeJSON(404, { error: "not found" }, rsp);
  }
}

function writeJSON(status: number, json: unknown, rsp: ServerResponse): void {
  const body = JSON.stringify(json);
  rsp.writeHead(status, {
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json",
  });
  rsp.end(body);
}

async function readJSON(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Uint8Array[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  await once(req, "end");
  try {
    return JSON.parse(`${Buffer.concat(chunks)}`);
  } catch {
    return {};
  }
}
