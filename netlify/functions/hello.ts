import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { getDb } from "../../db";
import { Planet } from "../../db/schema";


export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    try {
        const db = getDb();

        // Usando SQL puro con la sintaxis de Netlify
        // Esto devuelve un array de objetos que coinciden con tu interfaz Planet
        const result = await db.sql`SELECT * FROM planets`;

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Hola Mundo!",
                dbResponse: JSON.stringify(result)
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Database error",
                details: error instanceof Error ? error.message : "Unknown error"
            }),
        };
    }
};
