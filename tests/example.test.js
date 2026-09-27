import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Rotas da aplicação", () => {
    it("deve retornar 404 para uma rota inexistente", async () => {
        const response = await request(app)
            .get("/rota-que-nao-existe")
            .set("Authorization", `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE4YmJjMmE0LWJkZTYtNDllMi1hZGVkLWQ2OTU1NWEwZjllZiIsImlhdCI6MTc5MDM5NTI4OCwiZXhwIjoxNzkxNjkxMjg4fQ.iw3R9HOHacnGZFzV76naz_VN_8ANhVh9GQ2-oz7WddY`);
        expect(response.status).toBe(404);
    });
    it("deve retornar 401 ao acessar uma rota protegida sem token", async () => {
        const resposta = await request(app)
            .get("/players")
        expect(resposta.status).toBe(401);
    });
    it("deve retornar 401 ao acessar uma rota protegida com token inválido", async () => {
        const resposta = await request(app)
    .get("/players")
    .set("Authorization", `Bearer EyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE4YmJjMmE0LWJkZTYtNDllMi1hZGVkLWQ2OTU1NWEwZjllZiIsImlhdCI6MTc5MDM5NTI4OCwiZXhwIjoxNzkxNjkxMjg4fQ.iw3R9HOHacnGZFzV76naz_VN_8ANhVh9GQ2-oz7WddY`);
        expect(resposta.status).toBe(401);
    });
});