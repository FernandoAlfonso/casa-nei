import { getDatabase } from "@netlify/database";

// Esta función devuelve el cliente de la base de datos
export const getDb = () => {
    return getDatabase();
};
