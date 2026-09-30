import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("rate limit de login", () => {
    it("retorna 429 após exceder 10 tentativas em /sessions", async () => {
        const responses = [];

        for (let attempt = 0; attempt < 11; attempt += 1) {
            responses.push(await request(app).post("/sessions").send({}));
        }

        expect(responses.slice(0, 10).every(({ status }) => status !== 429)).toBe(true);
        expect(responses[10].status).toBe(429);
    });
});
