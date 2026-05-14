// Define aquí los tipos de tu base de datos si usas consultas crudas
export interface Planet {
  id: number;
  name: string;
  mass_kg: number;
  temperature_celsius: number;
}


// O, si usas algún ORM en el futuro como Prisma o Drizzle, 
// aquí iría la definición de tus tablas.
